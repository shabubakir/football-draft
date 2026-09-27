import GameShell from "@/components/game-shell";
import { QuizOnline } from "@/components/quiz-online";

export const metadata = {
  title: "Географическая викторина — Football Draft",
};

export default function QuizGeoPage() {
  return (
    <GameShell
      theme="geoguessr"
      maxWidth="max-w-4xl"
      header={{
        badge: "QUIZ SHOW",
        title: "ГЕОГРАФИЧЕСКАЯ ВИКТОРИНА",
        subtitle: "Отвечай быстро — таймер не ждёт",
      }}
    >
      <QuizOnline fixedTopic="geo" />
    </GameShell>
  );
}
