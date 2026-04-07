import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import DiaryScreen from "../screens/diary/DiaryScreen";
import NewLogScreen from "../screens/diary/NewLogScreen";
import LogDetailScreen from "../screens/diary/LogDetailScreen";
import BehaviorScreen from "../screens/behavior/BehaviorScreen";
import NewBehaviorScreen from "../screens/behavior/NewBehaviorScreen";
import AIAdvisorScreen from "../screens/ai/AIAdvisorScreen";
import AnalyticsScreen from "../screens/analytics/AnalyticsScreen";
import LibraryScreen from "../screens/library/LibraryScreen";
import type { RootStackParamList } from "./AppNavigator";
import { colors, spacing } from "../theme";

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
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="alert-circle" size={28} color={colors.sos} />
    </TouchableOpacity>
  );
}

function DiaryStackNavigator() {
  const { t } = useTranslation();
  return (
    <DiaryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerRight: () => <SOSButton />,
      }}
    >
      <DiaryStack.Screen
        name="DiaryHome"
        component={DiaryScreen}
        options={{ title: t("tabs.diary") }}
      />
      <DiaryStack.Screen
        name="NewLog"
        component={NewLogScreen}
        options={{ title: t("newLog.title") }}
      />
      <DiaryStack.Screen
        name="LogDetail"
        component={LogDetailScreen}
        options={{ title: t("diary.entry") }}
      />
    </DiaryStack.Navigator>
  );
}

function BehaviorStackNavigator() {
  const { t } = useTranslation();
  return (
    <BehaviorStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerRight: () => <SOSButton />,
      }}
    >
      <BehaviorStack.Screen
        name="BehaviorHome"
        component={BehaviorScreen}
        options={{ title: t("tabs.behavior") }}
      />
      <BehaviorStack.Screen
        name="NewBehavior"
        component={NewBehaviorScreen}
        options={{ title: "Новое поведение" }}
      />
    </BehaviorStack.Navigator>
  );
}

type TabIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

export default function MainNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: () => <SOSButton />,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textHint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="DiaryTab"
        component={DiaryStackNavigator}
        options={{
          title: t("tabs.diary"),
          headerShown: false,
          tabBarLabel: t("tabs.diary"),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="journal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BehaviorTab"
        component={BehaviorStackNavigator}
        options={{
          title: t("tabs.behavior"),
          headerShown: false,
          tabBarLabel: t("tabs.behavior"),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="warning-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AIAdvisorTab"
        component={AIAdvisorScreen}
        options={{
          title: t("tabs.aiAdvisor"),
          tabBarLabel: t("tabs.aiAdvisor"),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsScreen}
        options={{
          title: t("tabs.analytics"),
          tabBarLabel: t("tabs.analytics"),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{
          title: t("tabs.library"),
          tabBarLabel: t("tabs.library"),
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
});
