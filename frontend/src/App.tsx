import { Routes, Route, Navigate } from "react-router-dom";
import IDE from "./pages/IDE";
// import Profile from "./pages/Profile"; // Stubbed for your future roadmap

const App: React.FC = () => {
  return (
    <Routes>
      {/* Core Application */}
      <Route path="/" element={<IDE />} />

      {/* Future Expansion */}
      {/* <Route path="/profile" element={<Profile />} /> */}

      {/* The Catch-All Liability Shield: 
          If a user types /garbage-url, violently redirect them back to the IDE 
          without leaving a dead 404 entry in their browser history. 
      */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
