import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Game } from './Game.js';
import { Answer } from './Answer.js';

@Entity('participants')
export class Participant {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('text')
  game_id: string;

  @ManyToOne(() => Game, game => game.participants, { lazy: true })
  @JoinColumn({ name: 'game_id' })
  game: Promise<Game>;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  avatar: string;

  @Column('int', { default: 0 })
  total_score: number;

  @Column('int', { default: 0 })
  current_rank: number;

  @Column('text', { default: 'active' })
  status: string;

  @Column('boolean', { default: false })
  qualified: boolean;

  @Column('int', { default: 0 })
  cheat_warnings: number;

  @Column('int', { default: 0 })
  cheat_score: number;

  @Column('jsonb', { nullable: true })
  cheat_events: any;

  @Column('boolean', { default: false })
  is_flagged: boolean;

  @Column('timestamp', { nullable: true })
  last_cheat_detection: Date;

  @Column('text', { default: 'active' })
  game_status: string;

  @CreateDateColumn()
  joined_at: Date;

  @Column('text', { nullable: true })
  socket_id: string;

  @Column('text', { unique: true, nullable: true })
  session_token: string;

  @OneToMany(() => Answer, answer => answer.participant)
  answers: Answer[];
}