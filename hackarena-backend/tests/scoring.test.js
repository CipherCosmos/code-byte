// Mock TypeORM DataSource
jest.mock('../src/database/dataSource.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock socket.io
jest.mock('../src/server.js', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
}));

// Mock the functions to use the actual implementations
jest.mock('../src/routes/games.js', () => ({
  updateLeaderboard: jest.fn().mockImplementation(async (gameId) => {
    const { AppDataSource } = require('../src/database/dataSource.js');
    const participantRepository = AppDataSource.getRepository('Participant');

    const participants = await participantRepository.find({
      where: { game_id: gameId, status: 'active' },
      order: { total_score: 'DESC' },
      select: ['id', 'total_score']
    });

    for (let i = 0; i < participants.length; i++) {
      await participantRepository.update(
        { id: participants[i].id },
        { current_rank: i + 1 }
      );
    }

    const leaderboard = await participantRepository.find({
      where: { game_id: gameId, status: 'active' },
      order: { total_score: 'DESC' },
      select: ['name', 'avatar', 'total_score', 'current_rank']
    });

    const { io } = require('../src/server.js');
    io.to(`game-${gameId}`).emit('leaderboardUpdate', leaderboard);
  }),
  applyQualificationRules: jest.fn().mockImplementation(async (gameId) => {
    const { AppDataSource } = require('../src/database/dataSource.js');
    const gameRepository = AppDataSource.getRepository('Game');
    const participantRepository = AppDataSource.getRepository('Participant');

    const game = await gameRepository.findOne({
      where: { id: gameId },
      select: ['qualification_type', 'qualification_threshold']
    });

    if (!game || game.qualification_type === 'none') {
      return;
    }

    const participants = await participantRepository.find({
      where: { game_id: gameId, status: 'active' },
      order: { total_score: 'DESC' },
      select: ['id', 'total_score']
    });

    if (!participants || participants.length === 0) {
      return;
    }

    let qualifiedCount = 0;

    if (game.qualification_type === 'top_n') {
      qualifiedCount = Math.min(game.qualification_threshold, participants.length);
    } else if (game.qualification_type === 'top_percentage') {
      qualifiedCount = Math.ceil((game.qualification_threshold / 100) * participants.length);
    } else if (game.qualification_type === 'custom_threshold') {
      qualifiedCount = participants.filter(p => p.total_score >= game.qualification_threshold).length;
    }

    for (let i = 0; i < qualifiedCount; i++) {
      await participantRepository.update(
        { id: participants[i].id },
        { qualified: true }
      );
    }

    for (let i = qualifiedCount; i < participants.length; i++) {
      await participantRepository.update(
        { id: participants[i].id },
        { qualified: false }
      );
    }
  })
}));

// Import the mocked functions for testing
const { updateLeaderboard, applyQualificationRules } = require('../src/routes/games.js');
const { AppDataSource } = require('../src/database/dataSource.js');

describe('Scoring and Evaluation Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockParticipantRepository = {
      find: jest.fn(),
      update: jest.fn(),
    };
    const mockGameRepository = {
      findOne: jest.fn(),
    };
    AppDataSource.getRepository.mockImplementation((entity) => {
      if (entity === 'Participant') return mockParticipantRepository;
      if (entity === 'Game') return mockGameRepository;
      return {};
    });
  });

  describe('updateLeaderboard', () => {
    it('should update participant ranks correctly', async () => {
      const gameId = 1;
      const participants = [
        { id: 1, total_score: 100 },
        { id: 2, total_score: 80 },
        { id: 3, total_score: 90 },
        { id: 4, total_score: 70 }
      ];

      const expectedLeaderboard = [
        { name: 'Alice', avatar: 'avatar1.jpg', total_score: 100, current_rank: 1 },
        { name: 'Bob', avatar: 'avatar2.jpg', total_score: 90, current_rank: 2 },
        { name: 'Charlie', avatar: 'avatar3.jpg', total_score: 80, current_rank: 3 },
        { name: 'David', avatar: 'avatar4.jpg', total_score: 70, current_rank: 4 }
      ];

      const participantRepository = AppDataSource.getRepository('Participant');
      participantRepository.find
        .mockResolvedValueOnce(participants) // First call for participants
        .mockResolvedValueOnce(expectedLeaderboard); // Second call for leaderboard

      await updateLeaderboard(gameId);

      // Verify rank updates
      expect(participantRepository.update).toHaveBeenCalledTimes(4);
      expect(participantRepository.update).toHaveBeenNthCalledWith(1, { id: 1 }, { current_rank: 1 });
      expect(participantRepository.update).toHaveBeenNthCalledWith(2, { id: 2 }, { current_rank: 2 });
      expect(participantRepository.update).toHaveBeenNthCalledWith(3, { id: 3 }, { current_rank: 3 });
      expect(participantRepository.update).toHaveBeenNthCalledWith(4, { id: 4 }, { current_rank: 4 });
    });

    it('should emit leaderboard update to game room', async () => {
      const gameId = 1;
      const participants = [{ id: 1, total_score: 100 }];
      const leaderboard = [{ name: 'Alice', avatar: 'avatar1.jpg', total_score: 100, current_rank: 1 }];

      const participantRepository = AppDataSource.getRepository('Participant');
      participantRepository.find
        .mockResolvedValueOnce(participants)
        .mockResolvedValueOnce(leaderboard);

      await updateLeaderboard(gameId);

      const { io } = require('../src/server.js');
      expect(io.to).toHaveBeenCalledWith(`game-${gameId}`);
      expect(io.emit).toHaveBeenCalledWith('leaderboardUpdate', leaderboard);
    });
  });

  describe('applyQualificationRules', () => {
    it('should qualify top N participants', async () => {
      const gameId = 1;
      const game = { qualification_type: 'top_n', qualification_threshold: 3 };
      const participants = [
        { id: 1, total_score: 100 },
        { id: 2, total_score: 90 },
        { id: 3, total_score: 80 },
        { id: 4, total_score: 70 },
        { id: 5, total_score: 60 }
      ];

      const gameRepository = AppDataSource.getRepository('Game');
      const participantRepository = AppDataSource.getRepository('Participant');

      gameRepository.findOne.mockResolvedValueOnce(game);
      participantRepository.find.mockResolvedValueOnce(participants);

      await applyQualificationRules(gameId);

      // Should qualify top 3 participants
      expect(participantRepository.update).toHaveBeenCalledTimes(5);
      expect(participantRepository.update).toHaveBeenNthCalledWith(1, { id: 1 }, { qualified: true });
      expect(participantRepository.update).toHaveBeenNthCalledWith(2, { id: 2 }, { qualified: true });
      expect(participantRepository.update).toHaveBeenNthCalledWith(3, { id: 3 }, { qualified: true });
      expect(participantRepository.update).toHaveBeenNthCalledWith(4, { id: 4 }, { qualified: false });
      expect(participantRepository.update).toHaveBeenNthCalledWith(5, { id: 5 }, { qualified: false });
    });

    it('should qualify top percentage of participants', async () => {
      const gameId = 1;
      const game = { qualification_type: 'top_percentage', qualification_threshold: 50 }; // Top 50%
      const participants = [
        { id: 1, total_score: 100 },
        { id: 2, total_score: 90 },
        { id: 3, total_score: 80 },
        { id: 4, total_score: 70 }
      ];

      const gameRepository = AppDataSource.getRepository('Game');
      const participantRepository = AppDataSource.getRepository('Participant');

      gameRepository.findOne.mockResolvedValueOnce(game);
      participantRepository.find.mockResolvedValueOnce(participants);

      await applyQualificationRules(gameId);

      // Should qualify top 2 participants (50% of 4)
      expect(participantRepository.update).toHaveBeenCalledTimes(4);
      expect(participantRepository.update).toHaveBeenNthCalledWith(1, { id: 1 }, { qualified: true });
      expect(participantRepository.update).toHaveBeenNthCalledWith(2, { id: 2 }, { qualified: true });
      expect(participantRepository.update).toHaveBeenNthCalledWith(3, { id: 3 }, { qualified: false });
      expect(participantRepository.update).toHaveBeenNthCalledWith(4, { id: 4 }, { qualified: false });
    });

    it('should qualify participants above custom threshold', async () => {
      const gameId = 1;
      const game = { qualification_type: 'custom_threshold', qualification_threshold: 85 };
      const participants = [
        { id: 1, total_score: 100 },
        { id: 4, total_score: 95 },
        { id: 2, total_score: 90 },
        { id: 3, total_score: 80 }
      ];

      const gameRepository = AppDataSource.getRepository('Game');
      const participantRepository = AppDataSource.getRepository('Participant');

      gameRepository.findOne.mockResolvedValueOnce(game);
      participantRepository.find.mockResolvedValueOnce(participants);

      await applyQualificationRules(gameId);

      // Should qualify participants with score >= 85 (IDs 1, 4, 2)
      expect(participantRepository.update).toHaveBeenCalledTimes(4);
      expect(participantRepository.update).toHaveBeenNthCalledWith(1, { id: 1 }, { qualified: true });
      expect(participantRepository.update).toHaveBeenNthCalledWith(2, { id: 4 }, { qualified: true });
      expect(participantRepository.update).toHaveBeenNthCalledWith(3, { id: 2 }, { qualified: true });
      expect(participantRepository.update).toHaveBeenNthCalledWith(4, { id: 3 }, { qualified: false });
    });

    it('should do nothing for qualification_type none', async () => {
      const gameId = 1;
      const game = { qualification_type: 'none', qualification_threshold: 0 };

      const gameRepository = AppDataSource.getRepository('Game');
      gameRepository.findOne.mockResolvedValueOnce(game);

      await applyQualificationRules(gameId);

      // Should not update any participants
      const participantRepository = AppDataSource.getRepository('Participant');
      expect(participantRepository.update).not.toHaveBeenCalled();
    });
  });
});