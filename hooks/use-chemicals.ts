import { Chemical } from "@/types/chemicals";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "./use-toast";
import axios from "axios";
import { useDebounce } from "./use-debounce";

const useChemicals = () => {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterForm, setFilterForm] = useState("all");
  const [filterCharacteristic, setFilterCharacteristic] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deletingChemicalId, setDeletingChemicalId] = useState<string | null>(
    null
  );

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchChemicals = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/v1/chemicals");
      setChemicals(data.chemicals);
    } catch (error) {
      console.error("Gagal memuat data bahan kimia: ", error);
      toast({
        title: "Gagal",
        description: "Tidak dapat memuat data bahan kimia",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchChemicals();
  }, [fetchChemicals]);

  const handleRequestDelete = (chemicalId: string) => {
    setDeletingChemicalId(chemicalId);
    setOpenDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingChemicalId) return;

    try {
      setIsDeleting(true);
      await axios.delete(`/api/v1/chemicals/${deletingChemicalId}`, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });
      setChemicals((prev) => prev.filter((c) => c.id !== deletingChemicalId));
      toast({
        title: "Berhasil",
        description: "Bahan kimia berhasil dihapus",
      });
    } catch (error) {
      console.error("Gagal menghapus bahan kimia: ", error);
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menghapus bahan kimia",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setOpenDeleteModal(false);
      setDeletingChemicalId(null);
    }
  };

  const filteredChemicals = useMemo(() => {
    const search = debouncedSearchTerm.toLowerCase();

    return chemicals.filter((chemical) => {
      const matchesSearch =
        chemical.name.toLowerCase().includes(search) ||
        (chemical.formula || "").toLowerCase().includes(search);

      const matchesForm = filterForm === "all" || chemical.form === filterForm;

      const matchesLocation =
        filterCharacteristic === "all" ||
        (chemical.characteristic &&
          chemical.characteristic
            .toLowerCase()
            .includes(filterCharacteristic.toLowerCase()));

      return matchesSearch && matchesForm && matchesLocation;
    });
  }, [chemicals, debouncedSearchTerm, filterForm, filterCharacteristic]);

  const dasboardStatsChemicals = useMemo(() => {
    const totalChemicals = chemicals.length;
    const lowStockChemicals = chemicals.filter(
      (chemical) => chemical.stock <= 10
    ).length;
    const expiringChemicals = chemicals.filter(
      (chemical) =>
        chemical.expirationDate && chemical.expirationDate < new Date()
    ).length;

    return { totalChemicals, lowStockChemicals, expiringChemicals };
  }, [chemicals]);

  // pagination di frontend
  const totalPages = Math.ceil(filteredChemicals.length / pageSize);
  const paginatedChemicals = useMemo(
    () =>
      filteredChemicals.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredChemicals, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterForm, filterCharacteristic]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return {
    // Data
    chemicals: chemicals,
    filteredChemicals: filteredChemicals,
    paginatedChemicals: paginatedChemicals,
    dasboardStatsChemicals,
    loading,

    // Filter & search
    searchTerm,
    setSearchTerm,
    filterForm,
    setFilterForm,
    filterCharacteristic,
    setFilterCharacteristic,

    // Actions
    currentPage,
    totalPages,
    handlePageChange,

    // Delete modal
    openDeleteModal,
    setOpenDeleteModal,
    isDeleting,
    handleRequestDelete,
    handleConfirmDelete,
  };
};

export default useChemicals;
