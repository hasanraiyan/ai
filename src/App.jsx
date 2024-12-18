import { ThemeProvider } from "./components/theme-provider";
import { ChatLayout } from "./components/ChatLayout";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <div className="w-full min-h-screen bg-background font-sans antialiased">
        <main className="w-full h-screen">
          <ChatLayout />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
