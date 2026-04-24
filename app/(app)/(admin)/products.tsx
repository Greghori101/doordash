import FontAwesome from '@expo/vector-icons/FontAwesome';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAdminProducts, type Product } from '@/src/admin/use-admin-products';
import { firestore } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

export default function AdminProductsScreen() {
  const { colors } = useAppTheme();
  const profile = useAuthStore((s) => s.profile);
  const adminId = profile?.adminId ?? null;
  const { products } = useAdminProducts({ adminId });

  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  function resetForm() {
    setName('');
    setDescription('');
    setPrice('');
    setCategory('');
    setShowForm(false);
  }

  async function handleCreate() {
    if (!adminId) return;
    const trimmedName = name.trim();
    const parsedPrice = parseFloat(price);
    if (!trimmedName) {
      Alert.alert('Missing name', 'Enter a product name.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Invalid price', 'Enter a valid price.');
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(firestore, 'products'), {
        adminId,
        name: trimmedName,
        description: description.trim() || null,
        price: parsedPrice,
        category: category.trim() || null,
        available: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      resetForm();
    } catch (e: any) {
      Alert.alert('Create failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability(product: Product) {
    try {
      await updateDoc(doc(firestore, 'products', product.id), {
        available: !product.available,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    }
  }

  async function handleDelete(product: Product) {
    Alert.alert('Delete product', `Delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(firestore, 'products', product.id));
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message ?? 'Unknown error');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 2 }}>
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>
            Products
          </Text>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '700' }}>
            {products.length} item{products.length !== 1 ? 's' : ''} in catalog
          </Text>
        </View>
        <Pressable
          onPress={() => setShowForm((v) => !v)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderCurve: 'continuous',
            backgroundColor: showForm ? colors.secondary : colors.primary,
          }}
        >
          <Text selectable style={{ color: showForm ? colors.text : colors.primaryText, fontWeight: '900' }}>
            {showForm ? 'Cancel' : '+ Add Product'}
          </Text>
        </Pressable>
      </View>

      {showForm ? (
        <View
          style={{
            padding: 16,
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: colors.card,
            gap: 12,
          }}
        >
          <Text selectable style={{ color: colors.text, fontWeight: '900', letterSpacing: 0.5 }}>
            NEW PRODUCT
          </Text>

          {[
            { label: 'NAME *', value: name, onChange: setName, placeholder: 'Espresso Shot' },
            { label: 'DESCRIPTION', value: description, onChange: setDescription, placeholder: 'Optional' },
            { label: 'CATEGORY', value: category, onChange: setCategory, placeholder: 'Beverages, Food…' },
          ].map(({ label, value, onChange, placeholder }) => (
            <View key={label} style={{ gap: 6 }}>
              <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
                {label}
              </Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedText}
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  color: colors.text,
                  fontWeight: '700',
                }}
              />
            </View>
          ))}

          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
              PRICE (USD) *
            </Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.mutedText}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 12,
                borderRadius: 12,
                borderCurve: 'continuous',
                color: colors.text,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            />
          </View>

          <Pressable
            disabled={busy}
            onPress={handleCreate}
            style={{
              paddingVertical: 14,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: busy ? colors.disabled : colors.primary,
            }}
          >
            <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900' }}>
              CREATE PRODUCT
            </Text>
          </Pressable>
        </View>
      ) : null}

      {products.length === 0 && !showForm ? (
        <Text selectable style={{ color: colors.mutedText, textAlign: 'center', paddingTop: 40 }}>
          No products yet. Tap "+ Add Product" to create one.
        </Text>
      ) : null}

      <View style={{ gap: 10 }}>
        {products.map((product) => (
          <View
            key={product.id}
            style={{
              padding: 14,
              borderRadius: 18,
              borderCurve: 'continuous',
              backgroundColor: colors.card,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 15 }}>
                  {product.name}
                </Text>
                {product.description ? (
                  <Text selectable style={{ color: colors.mutedText, fontWeight: '700', fontSize: 13 }}>
                    {product.description}
                  </Text>
                ) : null}
                {product.category ? (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: colors.secondary,
                    }}
                  >
                    <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 11 }}>
                      {product.category.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 18, fontVariant: ['tabular-nums'] }}>
                ${product.price.toFixed(2)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => toggleAvailability(product)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderCurve: 'continuous',
                  backgroundColor: product.available ? '#D7F5DF' : colors.secondary,
                }}
              >
                <Text
                  selectable
                  style={{
                    textAlign: 'center',
                    fontWeight: '900',
                    fontSize: 12,
                    color: product.available ? '#0B5A2A' : colors.text,
                  }}
                >
                  {product.available ? '● AVAILABLE' : '○ UNAVAILABLE'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleDelete(product)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderCurve: 'continuous',
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <FontAwesome name="trash" size={14} color={colors.mutedText} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
