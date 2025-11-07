# Dun - Your Task Manager App �

A beautiful React Native task management app powered by Expo with AI-powered analytics using Claude.

## Features ✨

- **Task Management**: Create, edit, delete, and organize your daily tasks
- **Drag & Drop**: Reorder your tasks with intuitive drag-and-drop gestures
- **Calendar View**: Choose the date you want to manage tasks for
- **Theme Support**: Switch between dark and light themes
- **AI Analytics**: Get intelligent insights about your daily productivity using Claude AI
- **Cloud Sync**: All tasks are synced with Supabase

## Get started

### Prerequisites

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up environment variables

   Create a `.env` file in the root directory (see `.env.example` for reference):

   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_CLAUDE_API_KEY=your_claude_api_key
   ```

   **Getting your credentials:**
   - **Supabase**: Create a project at [supabase.com](https://supabase.com) and get your URL and anon key
   - **Claude API Key**: Get your API key from [Anthropic's console](https://console.anthropic.com)

3. Start the app

   ```bash
   npx expo start
   ```

   In the output, you'll find options to open the app in a:
   - [development build](https://docs.expo.dev/develop/development-builds/introduction/)
   - [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go)

## How to Use the AI Feature

1. Create or select tasks for the current day
2. Tap the **✨ (sparkles) button** in the top-right corner
3. Wait for Claude AI to analyze your tasks
4. Get personalized insights about your productivity and receive encouraging advice

The AI will provide:
- An observation on your productivity/workload
- A motivating comment or practical advice
- Suggestions to optimize your day

## Project Structure

```
Dun/
├── app/                 # App screens and routing
├── components/          # Reusable React components
├── lib/                 # Utility functions and services
├── assets/              # Images and fonts
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Learn more

To learn more about developing with Expo, check out:

- [Expo documentation](https://docs.expo.dev/)
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Supabase Documentation](https://supabase.com/docs)

## Contributing

Feel free to contribute to this project by opening issues or pull requests.

## License

This project is open source and available under the MIT License.
