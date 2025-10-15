import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Game } from './Game.ts';
import { Question } from './Question.ts';

@Entity('game_sessions')
export class GameSession {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('text')
  game_id: string;

  @ManyToOne(() => Game, game => game.sessions, { lazy: true })
  @JoinColumn({ name: 'game_id' })
  game: Promise<Game>;

  @Column('uuid', { nullable: true })
  current_question_id: string;

  @ManyToOne(() => Question, { lazy: true })
  @JoinColumn({ name: 'current_question_id' })
  currentQuestion: Promise<Question>;

  @Column('timestamp', { nullable: true })
  question_started_at: Date;

  @Column('timestamp', { nullable: true })
  question_ends_at: Date;

  @Column('timestamp', { nullable: true })
  paused_at: Date;

  @Column('boolean', { default: false })
  answers_revealed: boolean;

  @Column('int', { default: 0 })
  total_participants: number;

  @Column('int', { default: 0 })
  answered_participants: number;
}