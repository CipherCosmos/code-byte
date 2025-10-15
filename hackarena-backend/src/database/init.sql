-- HackArena Database Initialization Script
-- This script creates all necessary tables and initial data for local development

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  name TEXT NOT NULL,
  google_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  game_code TEXT UNIQUE NOT NULL,
  organizer_id UUID NOT NULL,
  status TEXT DEFAULT 'draft',
  current_question_index INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 500,
  qualification_type TEXT DEFAULT 'none',
  qualification_threshold INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  qr_code_url TEXT,
  FOREIGN KEY (organizer_id) REFERENCES users (id)
);

-- Create QuestionType enum
CREATE TYPE question_type_enum AS ENUM (
  'mcq',
  'multiple_choice_single',
  'true_false',
  'multiple_choice',
  'multiple_answers',
  'code',
  'image',
  'fill_blank',
  'short_answer',
  'crossword',
  'crossword_puzzle',
  'text_input'
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type question_type_enum NOT NULL,
  options TEXT,
  correct_answer TEXT NOT NULL,
  hint TEXT,
  hint_penalty INTEGER DEFAULT 10,
  time_limit INTEGER DEFAULT 60,
  marks INTEGER DEFAULT 10,
  difficulty TEXT DEFAULT 'medium',
  explanation TEXT,
  evaluation_mode TEXT DEFAULT 'mcq',
  test_cases TEXT,
  ai_validation_settings TEXT,
  image_url TEXT,
  crossword_grid TEXT,
  crossword_clues TEXT,
  crossword_size TEXT,
  partial_marking_settings TEXT,
  time_decay_enabled BOOLEAN DEFAULT FALSE,
  time_decay_factor DECIMAL(3,2) DEFAULT 0.1,
  code_languages TEXT,
  code_timeout INTEGER DEFAULT 30,
  code_memory_limit INTEGER DEFAULT 256,
  code_template TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games (id)
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  total_score INTEGER DEFAULT 0,
  current_rank INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  qualified BOOLEAN DEFAULT FALSE,
  cheat_warnings INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  socket_id TEXT,
  session_token TEXT UNIQUE,
  FOREIGN KEY (game_id) REFERENCES games (id)
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL,
  question_id UUID NOT NULL,
  answer_text TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  score_earned INTEGER DEFAULT 0,
  partial_score DECIMAL(5,2) DEFAULT 0,
  code_quality_score DECIMAL(5,2) DEFAULT 0,
  performance_score DECIMAL(5,2) DEFAULT 0,
  correctness_score DECIMAL(5,2) DEFAULT 0,
  time_taken INTEGER,
  hint_used BOOLEAN DEFAULT FALSE,
  execution_results TEXT,
  evaluation_mode TEXT,
  execution_time_ms INTEGER DEFAULT 0,
  memory_used_kb INTEGER DEFAULT 0,
  test_cases_passed INTEGER DEFAULT 0,
  total_test_cases INTEGER DEFAULT 0,
  auto_submitted BOOLEAN DEFAULT FALSE,
  auto_submitted_at TIMESTAMP,
  time_decay_bonus DECIMAL(5,4) DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants (id),
  FOREIGN KEY (question_id) REFERENCES questions (id)
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  current_question_id UUID,
  question_started_at TIMESTAMP,
  question_ends_at TIMESTAMP,
  paused_at TIMESTAMP,
  answers_revealed BOOLEAN DEFAULT FALSE,
  total_participants INTEGER DEFAULT 0,
  answered_participants INTEGER DEFAULT 0,
  auto_submitted_at TIMESTAMP,
  server_time_offset INTEGER DEFAULT 0,
  last_sync_timestamp TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games (id),
  FOREIGN KEY (current_question_id) REFERENCES questions (id)
);

-- Code execution results table
CREATE TABLE IF NOT EXISTS code_execution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  execution_time DECIMAL(5,2),
  memory_used INTEGER,
  output TEXT,
  error_message TEXT,
  test_case_passed BOOLEAN DEFAULT FALSE,
  test_case_input TEXT,
  test_case_expected_output TEXT,
  test_case_actual_output TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (answer_id) REFERENCES answers (id)
);

-- Supported languages table
CREATE TABLE IF NOT EXISTS supported_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_name TEXT UNIQUE NOT NULL,
  language_code TEXT UNIQUE NOT NULL,
  version TEXT,
  compiler_flags TEXT,
  timeout_multiplier DECIMAL(3,2) DEFAULT 1.0,
  memory_multiplier DECIMAL(3,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code templates table
CREATE TABLE IF NOT EXISTS code_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_code TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (language_id) REFERENCES supported_languages (id)
);

-- Insert default supported languages
INSERT INTO supported_languages (language_name, language_code, version, is_active) VALUES
('Python', 'python', '3.9', true),
('JavaScript', 'javascript', '18', true),
('Java', 'java', '17', true),
('C++', 'cpp', '11', true),
('C', 'c', '11', true)
ON CONFLICT (language_code) DO NOTHING;

-- Insert default code templates
INSERT INTO code_templates (language_id, template_name, template_code, description, is_default)
SELECT sl.id, 'Hello World', 'print("Hello, World!")', 'Basic hello world program', true
FROM supported_languages sl WHERE sl.language_code = 'python'
ON CONFLICT DO NOTHING;

INSERT INTO code_templates (language_id, template_name, template_code, description, is_default)
SELECT sl.id, 'Hello World', 'console.log("Hello, World!");', 'Basic hello world program', true
FROM supported_languages sl WHERE sl.language_code = 'javascript'
ON CONFLICT DO NOTHING;

INSERT INTO code_templates (language_id, template_name, template_code, description, is_default)
SELECT sl.id, 'Hello World', 'public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}', 'Basic hello world program', true
FROM supported_languages sl WHERE sl.language_code = 'java'
ON CONFLICT DO NOTHING;

INSERT INTO code_templates (language_id, template_name, template_code, description, is_default)
SELECT sl.id, 'Hello World', '#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}', 'Basic hello world program', true
FROM supported_languages sl WHERE sl.language_code = 'cpp'
ON CONFLICT DO NOTHING;

INSERT INTO code_templates (language_id, template_name, template_code, description, is_default)
SELECT sl.id, 'Hello World', '#include <stdio.h>
int main() {
    printf("Hello, World!\\n");
    return 0;
}', 'Basic hello world program', true
FROM supported_languages sl WHERE sl.language_code = 'c'
ON CONFLICT DO NOTHING;