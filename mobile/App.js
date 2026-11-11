import { useColorScheme, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { getColors } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import StepsScreen from './src/screens/StepsScreen';
import AgenciesScreen from './src/screens/AgenciesScreen';
import ImportantScreen from './src/screens/ImportantScreen';
import PlansScreen from './src/screens/PlansScreen';

const Tab = createBottomTabNavigator();

// Символьные «иконки» без сторонних наборов, чтобы не добавлять зависимости.
const GLYPHS = { Home: '⌂', Steps: '☰', Agencies: '▦', Important: '!', Plans: '▭' };

export default function App() {
  const scheme = useColorScheme();
  const c = getColors(scheme);
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: c.accent,
      background: c.bg,
      card: c.surface,
      text: c.text,
      border: c.border,
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: c.accent,
            tabBarInactiveTintColor: c.muted,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18 }} accessibilityElementsHidden importantForAccessibility="no">
                {GLYPHS[route.name]}
              </Text>
            ),
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Главная' }} />
          <Tab.Screen name="Steps" component={StepsScreen} options={{ title: 'Шаги' }} />
          <Tab.Screen name="Agencies" component={AgenciesScreen} options={{ title: 'Агентства' }} />
          <Tab.Screen name="Important" component={ImportantScreen} options={{ title: 'Важно' }} />
          <Tab.Screen name="Plans" component={PlansScreen} options={{ title: 'Тарифы' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
