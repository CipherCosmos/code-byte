import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User.ts';
import { Question } from './Question.ts';
import { Participant } from './Participant.ts';
import { GameSession } from './GameSession.ts';

@Entity('games')
export class Game {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('text')
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { unique: true })
  game_code: string;

  @Column('uuid')
  organizer_id: string;

  @ManyToOne(() => User, user => user.games, { lazy: true })
  @JoinColumn({ name: 'organizer_id' })
  organizer: Promise<User>;

  @Column('text', { default: 'draft' })
  status: string;

  @Column('int', { default: 0 })
  current_question_index: number;

  @Column('int', { default: 0 })
  total_questions: number;

  @Column('int', { default: 500 })
  max_participants: number;

  @Column('text', { default: 'none' })
  qualification_type: string;

  @Column('int', { default: 0 })
  qualification_threshold: number;

  @CreateDateColumn()
  created_at: Date;

  @Column('timestamp', { nullable: true })
  started_at: Date;

  @Column('timestamp', { nullable: true })
  ended_at: Date;

  @Column('text', { nullable: true })
  qr_code_url: string;

  @OneToMany(() => Question, question => question.game)
  questions: Question[];

  @OneToMany(() => Participant, participant => participant.game, { lazy: true })
  participants: Promise<Participant[]>;

  @OneToMany(() => GameSession, session => session.game)
  sessions: GameSession[];
}