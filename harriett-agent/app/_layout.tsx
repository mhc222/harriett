import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700', letterSpacing: 1 },
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: '#F1F5F9' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Harriett.',
            headerLargeTitle: true,
            headerLargeTitleStyle: { color: '#FFFFFF', fontWeight: '700' },
            headerLargeTitleShadowVisible: false,
            headerStyle: { backgroundColor: '#0F172A' },
          }}
        />
        <Stack.Screen
          name="message/[id]"
          options={{ title: 'Message' }}
        />
      </Stack>
    </>
  );
}
