import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthContext } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import SOSScreen from "../screens/sos/SOSScreen";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import { STORAGE_KEYS } from "../lib/constants";

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: { initialScreen?: "Login" | "Register" | "SpecialistRegister" } | undefined;
  Main: undefined;
  SOS: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const navRef = useNavigationContainerRef<RootStackParamList>();

  // Track previous auth value to detect changes (not fire on initial mount)
  const prevAuthRef = useRef<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE).then((val) => {
      setOnboardingDone(val === "true");
    });
  }, []);

  // React to auth state changes and navigate accordingly
  useEffect(() => {
    if (authLoading || onboardingDone === null) return;

    // Skip on initial render — initialRouteName already handles first screen
    if (prevAuthRef.current === null) {
      prevAuthRef.current = isAuthenticated;
      return;
    }

    // Only act when value actually changed
    if (prevAuthRef.current === isAuthenticated) return;
    prevAuthRef.current = isAuthenticated;

    if (!navRef.isReady()) return;

    if (isAuthenticated) {
      navRef.reset({ index: 0, routes: [{ name: "Main" }] });
    } else {
      // Logged out — go back to Auth
      navRef.reset({ index: 0, routes: [{ name: "Auth" }] });
    }
  }, [isAuthenticated, authLoading, onboardingDone, navRef]);

  if (authLoading || onboardingDone === null) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  const initialRoute: keyof RootStackParamList = !onboardingDone
    ? "Onboarding"
    : !isAuthenticated
    ? "Auth"
    : "Main";

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen
          name="SOS"
          component={SOSScreen}
          options={{ presentation: "modal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
