import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgxk7pczIeIMJtiKeO4OAE5FWu15IYndc",
  authDomain: "locationappartement-2f5da.firebaseapp.com",
  projectId: "locationappartement-2f5da",
  storageBucket: "locationappartement-2f5da.firebasestorage.app",
  messagingSenderId: "1066139908075",
  appId: "1:1066139908075:web:eb74fed8f6c9ec9d5ccbae"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const screenWidth = Dimensions.get('window').width;

export default function App() {
  const [apartments, setApartments] = useState([]);
  const [numApp, setNumApp] = useState('');
  const [design, setDesign] = useState('');
  const [loyer, setLoyer] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showChartType, setShowChartType] = useState('bar'); // 'bar' ou 'pie'
  const [loading, setLoading] = useState(true);

  // Charger les appartements depuis Firestore au démarrage
  useEffect(() => {
    fetchApartments();
  }, []);

  // Fonction pour récupérer les appartements depuis Firestore
  const fetchApartments = async () => {
    try {
      setLoading(true);
      const apartmentsCollection = collection(db, "Appartements");
      const apartmentsSnapshot = await getDocs(apartmentsCollection);
      const apartmentsList = apartmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        loyer: parseFloat(doc.data().loyer || 0) // Assurer que loyer est un nombre
      }));
      setApartments(apartmentsList);
    } catch (error) {
      console.error("Erreur lors du chargement des appartements:", error);
      alert("Erreur lors du chargement des données: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour calculer l'observation selon le loyer
  const calculateObs = (loyer) => {
    const loyerNum = parseFloat(loyer);
    if (loyerNum < 1000) return 'bas';
    if (loyerNum <= 5000) return 'moyen';
    return 'élevé';
  };

  // Fonction pour ajouter ou modifier un appartement
  const addApartment = async () => {
    if (!numApp.trim() || !design.trim() || !loyer.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (isNaN(parseFloat(loyer))) {
      alert('Le loyer doit être un nombre');
      return;
    }

    try {
      setLoading(true);
      const newApartment = {
        numApp,
        design,
        loyer: parseFloat(loyer),
        obs: calculateObs(loyer)
      };

      if (editingId) {
        // Mise à jour d'un appartement existant
        const apartmentRef = doc(db, "Appartements", editingId);
        await updateDoc(apartmentRef, newApartment);
        setApartments(apartments.map(apt => apt.id === editingId ? {...newApartment, id: editingId} : apt));
      } else {
        // Ajout d'un nouvel appartement
        const docRef = await addDoc(collection(db, "Appartements"), newApartment);
        setApartments([...apartments, {...newApartment, id: docRef.id}]);
      }

      resetForm();
      alert(editingId ? "Appartement modifié avec succès!" : "Appartement ajouté avec succès!");
    } catch (error) {
      console.error("Erreur lors de l'ajout/modification de l'appartement:", error);
      alert("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour modifier un appartement
  const editApartment = (apartment) => {
    setNumApp(apartment.numApp);
    setDesign(apartment.design);
    setLoyer(apartment.loyer.toString());
    setEditingId(apartment.id);
  };

  // Fonction pour supprimer un appartement
  const deleteApartment = async (id) => {
    try {
      setLoading(true);
      const apartmentRef = doc(db, "Appartements", id);
      await deleteDoc(apartmentRef);
      setApartments(apartments.filter(apt => apt.id !== id));
      alert("Appartement supprimé avec succès!");
    } catch (error) {
      console.error("Erreur lors de la suppression de l'appartement:", error);
      alert("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour réinitialiser le formulaire
  const resetForm = () => {
    setNumApp('');
    setDesign('');
    setLoyer('');
    setEditingId(null);
  };

  // Calcul des statistiques
  const totalLoyers = apartments.reduce((sum, apt) => sum + apt.loyer, 0);
  const minLoyer = apartments.length > 0 ? Math.min(...apartments.map(apt => apt.loyer)) : 0;
  const maxLoyer = apartments.length > 0 ? Math.max(...apartments.map(apt => apt.loyer)) : 0;

  // Calcul pour le graphique
  const chartData = {
    labels: ['Total', 'Min', 'Max'],
    datasets: [
      {
        data: [totalLoyers, minLoyer, maxLoyer],
      },
    ],
  };

  // Données pour le graphique en camembert
  const pieChartData = [
    {
      name: 'Total',
      value: totalLoyers,
      color: '#FF5733',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Min',
      value: minLoyer,
      color: '#33FF57',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Max',
      value: maxLoyer,
      color: '#3357FF',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
  ];

  // Configuration du graphique
  const chartConfig = {
    backgroundGradientFrom: '#FFF',
    backgroundGradientTo: '#FFF',
    color: (opacity = 1) => `rgba(66, 129, 164, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Gestion des Appartements</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Numéro d'appartement"
          value={numApp}
          onChangeText={setNumApp}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Désignation"
          value={design}
          onChangeText={setDesign}
        />
        <TextInput
          style={styles.input}
          placeholder="Loyer"
          value={loyer}
          onChangeText={setLoyer}
          keyboardType="numeric"
        />
        <TouchableOpacity 
          style={styles.button} 
          onPress={addApartment}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{editingId ? 'Modifier' : 'Ajouter'}</Text>
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={resetForm}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Annuler</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.listHeaderContainer}>
        <Text style={styles.listHeaderText}>Désignation</Text>
        <Text style={styles.listHeaderText}>Loyer</Text>
        <Text style={styles.listHeaderText}>Observation</Text>
        <Text style={styles.listHeaderText}>Actions</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={apartments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>{item.design}</Text>
              <Text style={styles.listItemText}>{item.loyer} €</Text>
              <Text style={[styles.listItemText,
                item.obs === 'bas' ? styles.obsLow :
                item.obs === 'moyen' ? styles.obsMedium :
                styles.obsHigh]}>{item.obs}</Text>
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => editApartment(item)}
                >
                  <Text style={styles.actionButtonText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteApartment(item.id)}
                >
                  <Text style={styles.actionButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun appartement enregistré</Text>
            </View>
          }
        />
      )}

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Total des loyers: {totalLoyers.toFixed(2)} €</Text>
        <Text style={styles.statsText}>Loyer minimal: {minLoyer.toFixed(2)} €</Text>
        <Text style={styles.statsText}>Loyer maximal: {maxLoyer.toFixed(2)} €</Text>
      </View>

      <TouchableOpacity
        style={styles.chartButton}
        onPress={() => setModalVisible(true)}
        disabled={loading || apartments.length === 0}
      >
        <Text style={styles.buttonText}>Voir les statistiques</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <ScrollView>
            <Text style={styles.modalTitle}>Statistiques des Loyers</Text>
            
            <View style={styles.chartTypeButtons}>
              <TouchableOpacity
                style={[styles.chartTypeButton, showChartType === 'bar' && styles.activeChartButton]} 
                onPress={() => setShowChartType('bar')}
              >
                <Text style={styles.chartTypeButtonText}>Histogramme</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTypeButton, showChartType === 'pie' && styles.activeChartButton]} 
                onPress={() => setShowChartType('pie')}
              >
                <Text style={styles.chartTypeButtonText}>Camembert</Text>
              </TouchableOpacity>
            </View>

            {showChartType === 'bar' ? (
              <BarChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                yAxisLabel="€"
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                style={styles.chart}
              />
            ) : (
              <PieChart
                data={pieChartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                accessor="value"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                style={styles.chart}
              />
            )}

            <View style={styles.modalStatsContainer}>
              <Text style={styles.statsText}>Total des loyers: {totalLoyers.toFixed(2)} €</Text>
              <Text style={styles.statsText}>Loyer minimal: {minLoyer.toFixed(2)} €</Text>
              <Text style={styles.statsText}>Loyer maximal: {maxLoyer.toFixed(2)} €</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Fermer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    marginTop: 8,
  },
  chartButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  listHeaderContainer: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    padding: 12,
    borderRadius: 5,
    marginBottom: 8,
  },
  listHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 5,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  obsLow: {
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  obsMedium: {
    color: '#f39c12',
    fontWeight: 'bold',
  },
  obsHigh: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
  },
  actionButton: {
    padding: 6,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 16,
  },
  editButton: {
    backgroundColor: '#f39c12',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statsText: {
    fontSize: 16,
    marginBottom: 6,
  },
  modalView: {
    flex: 1,
    margin: 20,
    marginTop: 40,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 20,
    borderRadius: 16,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    marginTop: 20,
  },
  modalStatsContainer: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 10,
  },
  chartTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  chartTypeButton: {
    backgroundColor: '#bdc3c7',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeChartButton: {
    backgroundColor: '#3498db',
  },
  chartTypeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#3498db',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});