import Anthropic from "@anthropic-ai/sdk";

interface Task {
  id: number;
  name: string;
  done: boolean;
  date?: string;
  description?: string;
  priority?: string;
}

interface AIAnalysisResult {
  analysis: string;
  loading: boolean;
  error?: string;
}

export const analyzeTasksWithAI = async (
  tasks: Task[],
  selectedDate: Date
): Promise<string> => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;

    if (!apiKey) {
      throw new Error(
        "EXPO_PUBLIC_CLAUDE_API_KEY is not defined in environment variables"
      );
    }

    const client = new Anthropic({
      apiKey: apiKey,
      defaultHeaders: {
        "anthropic-beta": "interop-2024-11-04",
      },
    });

    // Formater les tâches pour le prompt
    const formattedTasks = tasks
      .map(
        (task, index) =>
          `${index + 1}. ${task.name} (${task.done ? "✓ Complétée" : "⏳ En attente"})`
      )
      .join("\n");

    const dateString = selectedDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prompt = `Tu es un assistant productivité enthousiaste et bienveillant. 
    
L'utilisateur te montre sa liste de tâches pour aujourd'hui: ${dateString}

Voici ses tâches:
${formattedTasks || "Aucune tâche"}

Nombre total de tâches: ${tasks.length}
Tâches complétées: ${tasks.filter((t) => t.done).length}
Tâches restantes: ${tasks.filter((t) => !t.done).length}

Fournis une analyse bienveillante et motivante en 3-4 phrases. Inclus:
1. Une observation sur leur productivité/charge de travail
2. Un commentaire motivant ou un conseil pratique
3. Si applicable, une suggestion pour optimiser leur journée

Sois bref, chaleureux et encourageant. N'utilise pas d'emojis.`;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extraire le texte de la réponse
    const analysisText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n");

    return analysisText;
  } catch (error) {
    console.error("Erreur lors de l'analyse IA:", error);
    throw error;
  }
};
