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

  @Column('text', { nullable: true })
  answer_text: string;

  @Column('boolean', { default: false })
  is_correct: boolean;

  @Column('int', { default: 0 })
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

  @OneToMany(() => CodeExecutionResult, result => result.answer, { lazy: true })
  codeExecutionResults: Promise<CodeExecutionResult[]>;
}