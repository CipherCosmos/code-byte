import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { CodeTemplate } from './CodeTemplate.ts';

@Entity('supported_languages')
export class SupportedLanguage {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('text', { unique: true })
  language_name: string;

  @Column('text', { unique: true })
  language_code: string;

  @Column('text', { nullable: true })
  version: string;

  @Column('text', { nullable: true })
  compiler_flags: string;

  @Column('decimal', { precision: 3, scale: 2, default: 1.0 })
  timeout_multiplier: number;

  @Column('decimal', { precision: 3, scale: 2, default: 1.0 })
  memory_multiplier: number;

  @Column('boolean', { default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => CodeTemplate, template => template.language, { lazy: true })
  templates: Promise<CodeTemplate[]>;
}