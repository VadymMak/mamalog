import "./src/lib/i18n"; // init i18n before rendering
import React from "react";
import { AuthProvider } from "./src/context/AuthContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import { ProProvider } from "./src/context/ProContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <ProProvider>
        <LanguageProvider>
          <AppNavigator />
        </LanguageProvider>
      </ProProvider>
    </AuthProvider>
  );
}
