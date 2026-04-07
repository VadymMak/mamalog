import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useRoute, type RouteProp } from "@react-navigation/native";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import SpecialistRegisterScreen from "../screens/specialist/SpecialistRegisterScreen";
import type { RootStackParamList } from "./AppNavigator";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  SpecialistRegister: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const route = useRoute<RouteProp<RootStackParamList, "Auth">>();
  const initialScreen = route.params?.initialScreen ?? "Login";

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialScreen}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="SpecialistRegister" component={SpecialistRegisterScreen} />
    </Stack.Navigator>
  );
}
