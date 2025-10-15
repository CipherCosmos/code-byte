import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Answer } from './Answer.js';

@Entity('code_execution_results')
export class CodeExecutionResult {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('uuid')
  answer_id: string;

  @ManyToOne(() => Answer, answer => answer.codeExecutionResults, { lazy: true })
  @JoinColumn({ name: 'answer_id' })
  answer: Promise<Answer>;

  @Column('text')
  language: string;

  @Column('text')
  code: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  execution_time: number;

  @Column('int', { nullable: true })
  memory_used: number;

  @Column('text', { nullable: true })
  output: string;

  @Column('text', { nullable: true })
  error_message: string;

  @Column('boolean', { default: false })
  test_case_passed: boolean;

  @Column('text', { nullable: true })
  test_case_input: string;

  @Column('text', { nullable: true })
  test_case_expected_output: string;

  @Column('text', { nullable: true })
  test_case_actual_output: string;

  @CreateDateColumn()
  created_at: Date;
}