import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import DiaryScreen from "../screens/diary/DiaryScreen";
import NewLogScreen from "../screens/diary/NewLogScreen";
import LogDetailScreen from "../screens/diary/LogDetailScreen";
import BehaviorScreen from "../screens/behavior/BehaviorScreen";
import NewBehaviorScreen from "../screens/behavior/NewBehaviorScreen";
import AIAdvisorScreen from "../screens/ai/AIAdvisorScreen";
import AnalyticsScreen from "../screens/analytics/AnalyticsScreen";
import LibraryScreen from "../screens/library/LibraryScreen";
import SOSScreen from "../screens/sos/SOSScreen";
import type { RootStackParamList } from "./AppNavigator";

export type MainTabParamList = {
  DiaryTab: undefined;
  BehaviorTab: undefined;
  AIAdvisorTab: undefined;
  AnalyticsTab: undefined;
  LibraryTab: undefined;
};

export type DiaryStackParamList = {
  DiaryHome: undefined;
  NewLog: undefined;
  LogDetail: { id: string };
};

export type BehaviorStackParamList = {
  BehaviorHome: undefined;
  NewBehavior: { logEntryId?: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const DiaryStack = createNativeStackNavigator<DiaryStackParamList>();
const BehaviorStack = createNativeStackNavigator<BehaviorStackParamList>();

function SOSButton() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity
      style={styles.sosButton}
      onPress={() => navigation.navigate("SOS")}
      activeOpacity={0.8}
    >
      <Text style={styles.sosText}>SOS</Text>
    </TouchableOpacity>
  );
}

function DiaryStackNavigator() {
  return (
    <DiaryStack.Navigator>
      <DiaryStack.Screen
        name="DiaryHome"
        component={DiaryScreen}
        options={{ title: "Дневник", headerRight: () => <SOSButton /> }}
      />
      <DiaryStack.Screen name="NewLog" component={NewLogScreen} options={{ title: "Новая запись" }} />
      <DiaryStack.Screen name="LogDetail" component={LogDetailScreen} options={{ title: "Запись" }} />
    </DiaryStack.Navigator>
  );
}

function BehaviorStackNavigator() {
  return (
    <BehaviorStack.Navigator>
      <BehaviorStack.Screen
        name="BehaviorHome"
        component={BehaviorScreen}
        options={{ title: "Поведение", headerRight: () => <SOSButton /> }}
      />
      <BehaviorStack.Screen name="NewBehavior" component={NewBehaviorScreen} options={{ title: "Новое поведение" }} />
    </BehaviorStack.Navigator>
  );
}

export default function MainNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: () => <SOSButton />,
        tabBarActiveTintColor: "#E53E3E",
        tabBarInactiveTintColor: "#718096",
      }}
    >
      <Tab.Screen
        name="DiaryTab"
        component={DiaryStackNavigator}
        options={{ title: t("tabs.diary"), headerShown: false, tabBarLabel: t("tabs.diary") }}
      />
      <Tab.Screen
        name="BehaviorTab"
        component={BehaviorStackNavigator}
        options={{ title: t("tabs.behavior"), headerShown: false, tabBarLabel: t("tabs.behavior") }}
      />
      <Tab.Screen
        name="AIAdvisorTab"
        component={AIAdvisorScreen}
        options={{ title: t("tabs.aiAdvisor"), tabBarLabel: t("tabs.aiAdvisor") }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsScreen}
        options={{ title: t("tabs.analytics"), tabBarLabel: t("tabs.analytics") }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{ title: t("tabs.library"), tabBarLabel: t("tabs.library") }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    backgroundColor: "#E53E3E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  sosText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
