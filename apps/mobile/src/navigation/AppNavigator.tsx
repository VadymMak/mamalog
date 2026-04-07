import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useAuthContext } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import SOSScreen from "../screens/sos/SOSScreen";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import { STORAGE_KEYS } from "../lib/constants";
import { registerForPushNotifications } from "../lib/notifications";

// Set notification handler once at module level
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: { initialScreen?: "Login" | "Register" } | undefined;
  Main: undefined;
  SOS: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type InitialRoute = "Onboarding" | "Auth" | "Main";

export default function AppNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);

  useEffect(() => {
    const resolve = async () => {
      const onboardingDone = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      if (onboardingDone !== "true") {
        setInitialRoute("Onboarding");
        return;
      }
      setInitialRoute(isAuthenticated ? "Main" : "Auth");
    };
    if (!authLoading) resolve();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  if (authLoading || initialRoute === null) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
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
