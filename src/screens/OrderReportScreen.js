// src/screens/OrderReportScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { client } from '../sanity/sanityClient';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const getPastDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
};

const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const OrderReportScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    
    const [startDate, setStartDate] = useState(getPastDate(7));
    const [endDate, setEndDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(null); 
    const [totalEarning, setTotalEarning] = useState(0);
    const [activePreset, setActivePreset] = useState('Weekly');

    const onDateChange = (event, selectedDate) => {
        setShowPicker(null);
        if (event.type === 'set' && selectedDate) {
            if (showPicker === 'start') {
                setStartDate(selectedDate);
            } else {
                setEndDate(selectedDate);
            }
            setActivePreset(null);
        }
    };
    
    const handlePreset = (preset, days) => {
        setStartDate(getPastDate(days));
        setEndDate(new Date());
        setActivePreset(preset);
    };

    const handleGenerateReport = async () => {
        if (!user || !user.restaurant) return;
        
        setIsLoading(true);
        setReportData([]);
        setTotalEarning(0);
        
        const restaurantId = user.restaurant._id;
        const start = new Date(startDate); start.setHours(0, 0, 0, 0); 
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        
        const query = `
            *[_type == "foodOrder" && 
              restaurant._ref == $restaurantId &&
              orderStatus == "completed" && 
              _createdAt >= $startISO &&
              _createdAt <= $endISO
            ] | order(_createdAt desc) {
              _id, _createdAt, foodTotal 
            }
        `;

        try {
            const data = await client.fetch(query, { 
                restaurantId, 
                startISO: start.toISOString(), 
                endISO: end.toISOString() 
            });
            
            if (data.length === 0) {
                // Toast.show({ type: 'info', text1: 'No completed orders found.' });
            }

            setReportData(data);
            const total = data.reduce((sum, order) => sum + (order.foodTotal || 0), 0);
            setTotalEarning(total);

        } catch (err) {
            console.error("Report error:", err);
            Toast.show({ type: 'error', text1: 'Error generating report' });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        handleGenerateReport();
    }, [startDate, endDate]); 

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
                </TouchableOpacity>
                <Text style={styles.title}>Earnings Report</Text>
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                
                {/* --- Date Selection Section --- */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Date Range</Text>
                    
                    {/* Presets */}
                    <View style={styles.presetRow}>
                        <TouchableOpacity 
                            style={[styles.presetChip, activePreset === 'Weekly' && styles.presetChipActive]} 
                            onPress={() => handlePreset('Weekly', 7)}>
                            <Text style={[styles.presetText, activePreset === 'Weekly' && styles.presetTextActive]}>Last 7 Days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.presetChip, activePreset === 'Monthly' && styles.presetChipActive]} 
                            onPress={() => handlePreset('Monthly', 30)}>
                            <Text style={[styles.presetText, activePreset === 'Monthly' && styles.presetTextActive]}>Last 30 Days</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date Pickers */}
                    <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.dateBox} onPress={() => setShowPicker('start')}>
                            <View style={styles.iconBox}>
                                <Ionicons name="calendar-outline" size={20} color={COLORS.primaryYellow} />
                            </View>
                            <View>
                                <Text style={styles.dateLabel}>From</Text>
                                <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.dateDivider} />

                        <TouchableOpacity style={styles.dateBox} onPress={() => setShowPicker('end')}>
                            <View style={styles.iconBox}>
                                <Ionicons name="calendar-outline" size={20} color={COLORS.primaryYellow} />
                            </View>
                            <View>
                                <Text style={styles.dateLabel}>To</Text>
                                <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- Summary Card --- */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Payout</Text>
                    <Text style={styles.summaryAmount}>LKR {totalEarning.toFixed(2)}</Text>
                    <Text style={styles.summarySub}>for {reportData.length} completed orders</Text>
                </View>

                {/* --- Transactions List --- */}
                <Text style={styles.sectionLabel}>Statement Details</Text>
                
                {isLoading ? (
                    <ActivityIndicator size="large" color={COLORS.primaryYellow} style={{marginTop: 20}} />
                ) : reportData.length > 0 ? (
                    <View style={styles.tableContainer}>
                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.th, {flex: 2}]}>DATE</Text>
                            <Text style={[styles.th, {flex: 2}]}>ORDER ID</Text>
                            <Text style={[styles.th, {flex: 2, textAlign: 'right'}]}>AMOUNT</Text>
                        </View>
                        
                        {/* Rows */}
                        {reportData.map((order, index) => (
                            <View key={order._id} style={[styles.tableRow, index % 2 === 0 && styles.rowAlt]}>
                                <Text style={[styles.td, {flex: 2, color: COLORS.textLight}]}>
                                    {new Date(order._createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                </Text>
                                <Text style={[styles.td, {flex: 2, fontWeight: '600'}]}>
                                    #{order._id.slice(-6).toUpperCase()}
                                </Text>
                                <Text style={[styles.td, {flex: 2, textAlign: 'right', color: COLORS.success, fontWeight: 'bold'}]}>
                                    {order.foodTotal.toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={50} color={COLORS.border} />
                        <Text style={styles.emptyText}>No completed orders in this range.</Text>
                    </View>
                )}

                <View style={{height: 40}} />
            </ScrollView>
            
            {/* Native Date Picker */}
            {showPicker && (
                <DateTimePicker
                    value={showPicker === 'start' ? startDate : endDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.lightBackground },
    headerContainer: { 
        flexDirection: 'row', alignItems: 'center', padding: 20, 
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border 
    },
    backButton: { padding: 5 },
    title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 10 },
    container: { flex: 1, padding: 15 },
    
    sectionLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10, marginTop: 5 },
    
    card: {
        backgroundColor: COLORS.white, borderRadius: 12, padding: 15, marginBottom: 20,
        elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 4
    },
    
    presetRow: { flexDirection: 'row', marginBottom: 15 },
    presetChip: {
        paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, 
        backgroundColor: COLORS.lightBackground, marginRight: 10, borderWidth: 1, borderColor: COLORS.border
    },
    presetChipActive: { backgroundColor: COLORS.primaryYellow, borderColor: COLORS.primaryYellow },
    presetText: { fontSize: 13, fontWeight: '600', color: COLORS.textNormal },
    presetTextActive: { color: '#333' },

    dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateBox: { 
        flex: 1, flexDirection: 'row', alignItems: 'center', 
        padding: 10, backgroundColor: COLORS.lightBackground, borderRadius: 8 
    },
    iconBox: { 
        width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, 
        alignItems: 'center', justifyContent: 'center', marginRight: 10 
    },
    dateLabel: { fontSize: 11, color: COLORS.textLight },
    dateValue: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark },
    dateDivider: { width: 10 },

    summaryCard: {
        backgroundColor: '#333', borderRadius: 12, padding: 20, marginBottom: 25,
        alignItems: 'center', justifyContent: 'center'
    },
    summaryLabel: { color: COLORS.white, opacity: 0.7, fontSize: 14, marginBottom: 5 },
    summaryAmount: { color: COLORS.primaryYellow, fontSize: 32, fontWeight: 'bold' },
    summarySub: { color: COLORS.white, opacity: 0.5, fontSize: 12, marginTop: 5 },

    tableContainer: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', elevation: 1 },
    tableHeader: { 
        flexDirection: 'row', backgroundColor: COLORS.lightBackground, padding: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.border 
    },
    th: { fontSize: 12, fontWeight: 'bold', color: COLORS.textLight },
    tableRow: { 
        flexDirection: 'row', paddingVertical: 15, paddingHorizontal: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.border 
    },
    rowAlt: { backgroundColor: '#FAFAFA' },
    td: { fontSize: 14, color: COLORS.textDark },

    emptyState: { alignItems: 'center', marginTop: 30 },
    emptyText: { color: COLORS.textLight, marginTop: 10 }
});

export default OrderReportScreen;