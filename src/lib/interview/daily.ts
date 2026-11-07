export interface DailyQuestion {
  id: string;
  title: string;
  topic: string;
}

/** The same question for everyone on a given UTC day, cycling through the whole bank. */
export function pickDaily(questions: DailyQuestion[], now = new Date(Date.now())): DailyQuestion {
  const day = Math.floor(now.getTime() / 86_400_000);
  return questions[day % questions.length];
}
