import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Game } from './Game.js';
import { Answer } from './Answer.js';

@Entity('questions')
export class Question {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('text')
  game_id: string;

  @ManyToOne(() => Game, game => game.questions, { lazy: true })
  @JoinColumn({ name: 'game_id' })
  game: Promise<Game>;

  @Column('int')
  question_order: number;

  @Column('text')
  question_text: string;

  @Column('text')
  question_type: string;

  @Column('text', { nullable: true })
  options: string;

  @Column('text')
  correct_answer: string;

  @Column('text', { nullable: true })
  hint: string;

  @Column('int', { default: 10 })
  hint_penalty: number;

  @Column('int', { default: 60 })
  time_limit: number;

  @Column('int', { default: 10 })
  marks: number;

  @Column('text', { default: 'medium' })
  difficulty: string;

  @Column('text', { nullable: true })
  explanation: string;

  @Column('text', { default: 'mcq' })
  evaluation_mode: string;

  @Column('text', { nullable: true })
  test_cases: string;

  @Column('text', { nullable: true })
  ai_validation_settings: string;

  @Column('text', { nullable: true })
  image_url: string;

  @Column('text', { nullable: true })
  crossword_grid: string;

  @Column('text', { nullable: true })
  crossword_clues: string;

  @Column('text', { nullable: true })
  crossword_size: string;

  @Column('text', { nullable: true })
  partial_marking_settings: string;

  @Column('boolean', { default: false })
  time_decay_enabled: boolean;

  @Column('decimal', { precision: 3, scale: 2, default: 0.1 })
  time_decay_factor: number;

  @Column('text', { nullable: true })
  code_languages: string;

  @Column('int', { default: 30 })
  code_timeout: number;

  @Column('int', { default: 256 })
  code_memory_limit: number;

  @Column('text', { nullable: true })
  code_template: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Answer, answer => answer.question, { lazy: true })
  answers: Promise<Answer[]>;
}