// Vocabulary comes from the question, never the reference answer or a transcript.
const VOCABULARY = ['XGBoost', 'RAG', 'LoRA', 'embeddings', 'BM25', 'LLM', 'LLMs', 'GPU', 'GPUs', 'PyTorch', 'TensorFlow', 'SQL', 'Kubernetes', 'Transformer', 'attention', 'tokenization', 'fine-tuning'];
export function questionSpeechPrompt(question: string): string {
  const words: string[] = question.toLowerCase().match(/[a-z0-9]+(?:-[a-z]+)*/g) ?? [];
  const terms = VOCABULARY.filter(term => words.includes(term.toLowerCase()));
  return terms.length ? terms.join(', ') + '.' : '';
}
