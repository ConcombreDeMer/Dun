import { render, screen } from "@testing-library/react-native";

import { FontProvider } from "@/lib/FontContext";
import { i18n } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/ThemeContext";

import DatabaseErrorScreen from "./DatabaseErrorScreen";

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

const renderScreen = () =>
  render(
    <ThemeProvider>
      <FontProvider>
        <DatabaseErrorScreen />
      </FontProvider>
    </ThemeProvider>,
  );

describe("DatabaseErrorScreen", () => {
  /* After the automatic cleanup, once nothing is rendered any more. */
  afterAll(async () => {
    await i18n.changeLanguage("fr");
  });

  it("renders the title and the message in French", async () => {
    await i18n.changeLanguage("fr");
    await renderScreen();

    expect(
      await screen.findByText("Impossible d'ouvrir tes données"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Redémarre Dun. Si le problème continue, contacte le support.",
      ),
    ).toBeOnTheScreen();
  });

  it("renders the title and the message in English", async () => {
    await i18n.changeLanguage("en");
    await renderScreen();

    expect(
      await screen.findByText("Couldn't open your data"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Restart Dun. If the problem continues, contact support.",
      ),
    ).toBeOnTheScreen();
  });
});
