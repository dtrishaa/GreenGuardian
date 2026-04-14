// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateProfile, deleteAccount, updateSettings } = useAuth();

  const [plantCount,   setPlantCount]   = useState(0);
  const [waterToday,   setWaterToday]   = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const [notifications, setNotifications] = useState(user?.notifications ?? true);

  // Edit profile modal
  const [editVisible,      setEditVisible]      = useState(false);
  const [editName,         setEditName]         = useState(user?.name  || '');
  const [editEmail,        setEditEmail]        = useState(user?.email || '');
  const [editPassword,     setEditPassword]     = useState('');
  const [currentPassword,  setCurrentPassword]  = useState('');
  const [editLoading,      setEditLoading]      = useState(false);

  // Delete account modal
  const [deleteVisible,    setDeleteVisible]    = useState(false);
  const [deletePassword,   setDeletePassword]   = useState('');
  const [deleteLoading,    setDeleteLoading]    = useState(false);

  useEffect(() => {
    setNotifications(user?.notifications ?? true);
  }, [user]);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    db.collection('plants').where('userId', '==', userId).get()
      .then(snap => {
        const plants = snap.docs.map(d => d.data());
        setPlantCount(plants.length);
        const urgent = plants.filter(p => {
          if (!p.lastWatered) return true;
          return Math.ceil((new Date(p.lastWatered).getTime() + p.wateringInterval * 86400000 - Date.now()) / 86400000) <= 0;
        }).length;
        setWaterToday(urgent);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const handleToggleNotifications = async (val) => {
    setNotifications(val);
    try { await updateSettings({ notifications: val }); }
    catch (e) { setNotifications(!val); Alert.alert('Error', e.message); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        try { await logout(); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setEditLoading(true);
    try {
      const emailChanged = editEmail.trim() !== user?.email;
      const passwordChanging = !!editPassword;
      await updateProfile({
        name:            editName.trim(),
        email:           emailChanged ? editEmail.trim() : undefined,
        password:        editPassword || undefined,
        currentPassword: (emailChanged || passwordChanging) ? currentPassword : undefined,
      });
      setEditVisible(false);
      setEditPassword('');
      setCurrentPassword('');
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Required', 'Please enter your password to confirm deletion.');
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = () => {
    setEditName(user?.name  || '');
    setEditEmail(user?.email || '');
    setEditPassword('');
    setCurrentPassword('');
    setEditVisible(true);
  };

  const initials = (user?.name || 'P').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: openEdit, arrow: true },
    { icon: 'notifications-outline', label: 'Reminder Time', onPress: () => navigation.navigate('NotificationSettings'), arrow: true },
    { icon: 'notifications-outline', label: 'Notifications',
      right: <Switch value={notifications} onValueChange={handleToggleNotifications} trackColor={{ false: '#e5e7eb', true: '#2e7d32' }} thumbColor="#fff" /> },
    { icon: 'trash-outline', label: 'Delete Account', onPress: () => setDeleteVisible(true), arrow: true, danger: true },
  ];

  return (
    <LinearGradient colors={['#f0faf4', '#f9fafb']} style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1b5e20', '#2e7d32']} style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Plant Parent'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.badge}>
            <Ionicons name="leaf" size={12} color="#2e7d32" />
            <Text style={styles.badgeText}>Plant Lover</Text>
          </View>
        </LinearGradient>

        {statsLoading ? (
          <ActivityIndicator size="small" color="#2e7d32" style={{ margin: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{plantCount}</Text>
              <Text style={styles.statLabel}>Plants</Text>
            </View>
            <View style={[styles.statCard, waterToday > 0 && styles.statCardUrgent]}>
              <Text style={[styles.statNum, waterToday > 0 && { color: '#dc2626' }]}>{waterToday}</Text>
              <Text style={styles.statLabel}>Water Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>
                {user?.createdAt
                  ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt)) / 86400000))
                  : 1}
              </Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconWrap, item.danger && styles.menuIconWrapDanger]}>
                    <Ionicons name={item.icon} size={18} color={item.danger ? '#dc2626' : '#2e7d32'} />
                  </View>
                  <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>{item.label}</Text>
                </View>
                <View style={styles.menuRight}>
                  {item.right || null}
                  {item.arrow && <Ionicons name="chevron-forward" size={16} color="#d1d5db" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>GreenGuardian v1.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>New Password <Text style={styles.optional}>(leave blank to keep)</Text></Text>
            <TextInput
              style={styles.input}
              value={editPassword}
              onChangeText={setEditPassword}
              placeholder="••••••••"
              secureTextEntry
              placeholderTextColor="#9ca3af"
            />

            {(editEmail.trim() !== user?.email || !!editPassword) && (
              <>
                <Text style={styles.fieldLabel}>
                  Current Password <Text style={{ color: '#dc2626' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.inputHighlight]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Required to change email/password"
                  secureTextEntry
                  placeholderTextColor="#9ca3af"
                />
              </>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={editLoading} activeOpacity={0.85}>
              {editLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={deleteVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#dc2626' }]}>Delete Account</Text>
              <TouchableOpacity onPress={() => setDeleteVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.deleteBanner}>
              <Ionicons name="warning-outline" size={18} color="#92400e" />
              <Text style={styles.deleteWarning}>
                This will permanently delete your account and all plant data. This cannot be undone.
              </Text>
            </View>
            <Text style={styles.fieldLabel}>
              Enter your password to confirm <Text style={{ color: '#dc2626' }}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Your current password"
              secureTextEntry
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleConfirmDelete} disabled={deleteLoading} activeOpacity={0.85}>
              {deleteLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteConfirmText}>Yes, Delete My Account</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1 },
  header:            { paddingTop: 54, paddingBottom: 32, alignItems: 'center' },
  avatarCircle:      { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarInitials:    { fontSize: 32, fontWeight: '700', color: '#fff' },
  userName:          { fontSize: 22, fontWeight: '800', color: '#fff' },
  userEmail:         { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  badge:             { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  badgeText:         { color: '#2e7d32', fontSize: 13, fontWeight: '600' },
  statsRow:          { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 20 },
  statCard:          { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  statCardUrgent:    { borderWidth: 1, borderColor: '#fecaca' },
  statNum:           { fontSize: 24, fontWeight: '800', color: '#2e7d32' },
  statLabel:         { fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  section:           { paddingHorizontal: 16, marginBottom: 16 },
  menuCard:          { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  menuItem:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuItemBorder:    { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuLeft:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconWrap:      { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  menuIconWrapDanger:{ backgroundColor: '#fef2f2' },
  menuLabel:         { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  menuLabelDanger:   { color: '#dc2626' },
  menuRight:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 16, paddingVertical: 15, borderWidth: 1, borderColor: '#fecaca' },
  logoutText:        { color: '#dc2626', fontSize: 16, fontWeight: '700' },
  version:           { textAlign: 'center', fontSize: 12, color: '#d1d5db' },
  // Modal
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:         { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48 },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:        { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  fieldLabel:        { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  optional:          { fontWeight: '400', color: '#9ca3af' },
  input:             { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: '#111827', backgroundColor: '#fafafa' },
  inputHighlight:    { borderColor: '#fbbf24', backgroundColor: '#fffbeb' },
  saveBtn:           { backgroundColor: '#2e7d32', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  saveBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBanner:      { flexDirection: 'row', gap: 8, backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: '#fde68a' },
  deleteWarning:     { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  deleteConfirmBtn:  { backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  deleteConfirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn:         { alignItems: 'center', paddingVertical: 14 },
  cancelText:        { color: '#6b7280', fontSize: 15 },
});