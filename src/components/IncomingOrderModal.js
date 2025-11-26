import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const IncomingOrderModal = ({ isVisible, order, onAccept, onReject }) => {
    const [seconds, setSeconds] = useState(60);
    const soundRef = useRef(null);

    useEffect(() => {
        let soundObject = null;
        const playSound = async () => {
            if (isVisible) {
                try {
                    // Make sure 'notification.mp3' is in your assets folder
                    // If you don't have the file yet, comment out the next 4 lines to prevent crash
                    const { sound } = await Audio.Sound.createAsync(
                        require('../../assets/notification.mp3')
                    );
                    soundObject = sound;
                    soundRef.current = sound;
                    await sound.setIsLoopingAsync(true);
                    await sound.playAsync();
                } catch (error) {
                    console.log("Sound error (Check assets/notification.mp3):", error);
                }
            }
        };

        if (isVisible) {
            setSeconds(60);
            playSound();
        } else {
            if (soundRef.current) {
                soundRef.current.stopAsync();
                soundRef.current.unloadAsync();
            }
        }

        return () => {
            if (soundObject) {
                soundObject.stopAsync();
                soundObject.unloadAsync();
            }
        };
    }, [isVisible]);

    useEffect(() => {
        let interval = null;
        if (isVisible && seconds > 0) {
            interval = setInterval(() => {
                setSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isVisible, seconds]);

    if (!isVisible || !order) return null;

    return (
        <Modal transparent={true} visible={isVisible} animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.timerBadge}>
                            <Ionicons name="time" size={16} color="#FFF" />
                            <Text style={styles.timerText}>{seconds}s</Text>
                        </View>
                        <Text style={styles.title}>New Order Request</Text>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Order ID:</Text>
                            <Text style={styles.value}>#{order._id ? order._id.slice(-6).toUpperCase() : '...'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Items:</Text>
                            <Text style={styles.value}>{order.items?.length || 0} Items</Text>
                        </View>
                        <View style={styles.totalBox}>
                            <Text style={styles.totalLabel}>Earnings</Text>
                            <Text style={styles.totalAmount}>LKR {order.foodTotal?.toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(order)}>
                            <Text style={styles.rejectText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(order, '25')}>
                            <Text style={styles.acceptText}>Accept (25 min)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40
    },
    modalContainer: {
        width: width * 0.9, backgroundColor: COLORS.white, borderRadius: 20,
        overflow: 'hidden', elevation: 10
    },
    header: {
        backgroundColor: COLORS.primaryYellow, padding: 15, alignItems: 'center',
        flexDirection: 'row', justifyContent: 'center'
    },
    timerBadge: {
        position: 'absolute', left: 15, backgroundColor: '#000', 
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, flexDirection: 'row', alignItems: 'center'
    },
    timerText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    content: { padding: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    label: { fontSize: 16, color: COLORS.textLight },
    value: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
    totalBox: { 
        marginTop: 10, padding: 15, backgroundColor: COLORS.lightBackground, 
        borderRadius: 10, alignItems: 'center' 
    },
    totalLabel: { fontSize: 14, color: COLORS.textLight },
    totalAmount: { fontSize: 24, fontWeight: 'bold', color: COLORS.success, marginTop: 5 },
    actions: { flexDirection: 'row', padding: 20, paddingTop: 0 },
    rejectBtn: { 
        flex: 1, padding: 15, backgroundColor: COLORS.white, borderWidth: 1, 
        borderColor: COLORS.danger, borderRadius: 12, marginRight: 10, alignItems: 'center' 
    },
    rejectText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 16 },
    acceptBtn: { 
        flex: 2, padding: 15, backgroundColor: COLORS.success, 
        borderRadius: 12, alignItems: 'center' 
    },
    acceptText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 }
});

export default IncomingOrderModal;