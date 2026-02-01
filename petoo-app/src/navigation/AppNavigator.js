import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthSelectScreen from '../screens/auth/AuthSelectScreen';
import VerificationScreen from '../screens/auth/VerificationScreen';
import ClientRegisterScreen from '../screens/auth/ClientRegisterScreen';
import BusinessInviteScreen from '../screens/auth/BusinessInviteScreen';
import BusinessRegisterScreen from '../screens/auth/BusinessRegisterScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import AdminRequestsScreen from '../screens/auth/AdminRequestsScreen';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyPetsScreen from '../screens/MyPetsScreen';
import PetFormScreen from '../screens/PetFormScreen';
import PetMonitoringScreen from '../screens/PetMonitoringScreen';
import OrdersScreen from '../screens/OrdersScreen';
import LoadingDemoScreen from '../screens/LoadingDemoScreen';

// Store & Booking Screens
import StoreDetailsScreen from '../screens/StoreDetailsScreen';
import HotelDetailsScreen from '../screens/HotelDetailsScreen';
import GroomingBookingScreen from '../screens/GroomingBookingScreen';
import HotelPetBookingScreen from '../screens/HotelPetBookingScreen';

// Business Screens
import BusinessDashboardScreen from '../screens/business/BusinessDashboardScreen';
import BusinessProfileScreen from '../screens/business/BusinessProfileScreen';
import EmployeesScreen from '../screens/business/EmployeesScreen';
import ActivePetsScreen from '../screens/business/ActivePetsScreen';
import BusinessDiaryUpdateScreen from '../screens/business/BusinessDiaryUpdateScreen';
import BusinessBookingsScreen from '../screens/business/BusinessBookingsScreen';
import BusinessBookingDetailsScreen from '../screens/business/BusinessBookingDetailsScreen';
import BusinessServicesScreen from '../screens/business/BusinessServicesScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="AuthSelect"
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            >
                {/* Auth Flow */}
                <Stack.Screen name="AuthSelect" component={AuthSelectScreen} />
                <Stack.Screen name="Verification" component={VerificationScreen} />
                <Stack.Screen name="ClientRegister" component={ClientRegisterScreen} />
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                <Stack.Screen name="BusinessInvite" component={BusinessInviteScreen} />
                <Stack.Screen name="BusinessRegister" component={BusinessRegisterScreen} />
                <Stack.Screen name="AdminRequests" component={AdminRequestsScreen} />

                {/* Main App */}
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="MyPets" component={MyPetsScreen} />
                <Stack.Screen name="PetForm" component={PetFormScreen} />
                <Stack.Screen name="PetMonitoring" component={PetMonitoringScreen} />
                <Stack.Screen name="Orders" component={OrdersScreen} />

                {/* Store & Booking Flow */}
                <Stack.Screen name="StoreDetails" component={StoreDetailsScreen} />
                <Stack.Screen name="HotelDetails" component={HotelDetailsScreen} />
                <Stack.Screen name="GroomingBooking" component={GroomingBookingScreen} />
                <Stack.Screen name="HotelPetBooking" component={HotelPetBookingScreen} />

                {/* Business Flow */}
                <Stack.Screen name="BusinessDashboard" component={BusinessDashboardScreen} />
                <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
                <Stack.Screen name="Employees" component={EmployeesScreen} />
                <Stack.Screen name="ActivePets" component={ActivePetsScreen} />
                <Stack.Screen name="BusinessDiaryUpdate" component={BusinessDiaryUpdateScreen} />
                <Stack.Screen name="BusinessBookings" component={BusinessBookingsScreen} />
                <Stack.Screen name="BusinessBookingDetails" component={BusinessBookingDetailsScreen} />
                <Stack.Screen name="BusinessServices" component={BusinessServicesScreen} />

                <Stack.Screen name="LoadingDemo" component={LoadingDemoScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
