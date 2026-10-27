import { FeedbackProvider } from "./context/FeedbackContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <FeedbackProvider>
      <AppRoutes />
    </FeedbackProvider>
  );
}
