import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Participant } from './Participant.js';
import { Question } from './Question.js';
import { CodeExecutionResult } from './CodeExecutionResult.js';

@Entity('answers')
export class Answer {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('uuid')
  participant_id: string;

  @ManyToOne(() => Participant, participant => participant.answers, { lazy: true })
  @JoinColumn({ name: 'participant_id' })
  participant: Promise<Participant>;

  @Column('uuid')
  question_id: string;

  @ManyToOne(() => Question, question => question.answers, { lazy: true })
  @JoinColumn({ name: 'question_id' })
  question: Promise<Question>;

  @Column('text', { name: 'answer', nullable: false })
  answer: string;

  @Column('boolean', { nullable: true, default: false })
  is_correct: boolean;

  @Column('int', { nullable: true, default: 0 })
  score_earned: number;

  @Column('int', { nullable: true })
  time_taken: number;

  @Column('boolean', { default: false })
  hint_used: boolean;

  @CreateDateColumn()
  submitted_at: Date;

  @Column('text', { nullable: true })
  execution_results: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  partial_score: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  code_quality_score: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  performance_score: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  correctness_score: number;

  @Column('text', { nullable: true })
  evaluation_mode: string;

  @Column('int', { default: 0 })
  execution_time_ms: number;

  @Column('int', { default: 0 })
  memory_used_kb: number;

  @Column('int', { default: 0 })
  test_cases_passed: number;

  @Column('int', { default: 0 })
  total_test_cases: number;

  @Column('timestamp', { nullable: true })
  auto_submitted_at: Date;

  @Column('int', { default: 0 })
  score: number;

  @Column('int', { default: 0 })
  hint_penalty: number;

  @Column('int', { nullable: true })
  response_time_ms: number;

  @Column('int', { default: 0 })
  base_score: number;

  @Column('int', { default: 0 })
  time_bonus: number;

  @Column('int', { default: 0 })
  streak_bonus: number;

  @Column('int', { default: 0 })
  difficulty_bonus: number;

  @Column('int', { default: 0 })
  speed_bonus: number;

  @Column('int', { default: 0 })
  first_correct_bonus: number;

  @Column('int', { default: 0 })
  partial_credit: number;

  @Column('int', { default: 0 })
  late_penalty: number;

  @Column('int', { default: 0 })
  total_bonuses: number;

  @Column('int', { default: 0 })
  total_penalties: number;

  @Column('int', { default: 0 })
  final_score: number;

  @Column('jsonb', { nullable: true })
  scoring_breakdown: any;

  @Column('int', { default: 0 })
  hints_used: number;

  @Column('decimal', { precision: 5, scale: 4, default: 0 })
  time_decay_bonus: number;

  @Column('boolean', { nullable: true, default: false })
  auto_submitted: boolean;

  @Column('text', { nullable: true })
  answer_text: string;

  @OneToMany(() => CodeExecutionResult, result => result.answer, { lazy: true })
  codeExecutionResults: Promise<CodeExecutionResult[]>;
}