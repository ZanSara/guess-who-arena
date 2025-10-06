-- Update winner column comment to include 'tie' option
COMMENT ON COLUMN games.winner IS '''user'', ''llm'', ''tie'', or NULL if incomplete';
