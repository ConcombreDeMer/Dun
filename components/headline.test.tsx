import { render, screen } from "@testing-library/react-native";

import { FontProvider } from "@/lib/FontContext";
import { ThemeProvider } from "@/lib/ThemeContext";

import Headline from "./headline";

/*
 * The providers load the user's preferences through Supabase. With no
 * signed-in user, they fall back to AsyncStorage (official mock in
 * `jest.setup.ts`).
 */
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  },
}));

describe("Headline", () => {
  it("renders the title and the subtitle", async () => {
    await render(
      <ThemeProvider>
        <FontProvider>
          <Headline title="Aujourd'hui" subtitle="Mardi 8 octobre" />
        </FontProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText("Mardi 8 octobre")).toBeOnTheScreen();
  });
});
