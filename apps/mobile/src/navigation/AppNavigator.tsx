import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthContext } from "../context/AuthContext";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import SOSScreen from "../screens/sos/SOSScreen";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  SOS: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
        {/* SOS always accessible regardless of auth state */}
        <Stack.Screen
          name="SOS"
          component={SOSScreen}
          options={{ presentation: "modal", headerShown: false }}
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
