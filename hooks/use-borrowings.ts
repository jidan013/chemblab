import { Borrowing } from "@/types/borrowings";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "./use-debounce";
import { useToast } from "./use-toast";
import axios from "axios";

interface UseBorrowingsParams {
  searchTerm: string;
  filterStatus: string;
  filterRole: string;
}

const useBorrowings = ({
  searchTerm,
  filterStatus,
  filterRole,
}: UseBorrowingsParams) => {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    RETURNED: 0,
    OVERDUE: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deletingChemicalId, setDeletingChemicalId] = useState<string | null>(
    null
  );
  const [pagination, setPagination] = useState({
    currentPage: 1,
    total: 0,
    totalPages: 1,
  });

  const debouncedSearch = useDebounce(searchTerm, 400);
  const { toast } = useToast();

  const fetchBorrowings = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page,
          limit: 10,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(filterStatus !== "all" && { status: filterStatus }),
          ...(filterRole !== "all" && { userRole: filterRole }),
        };

        const { data } = await axios.get(`/api/v1/borrowings`, {
          params,
        });

        setBorrowings(data.formattedBorrowings);
        setTotal(data.totalFiltered ?? data.pagination.total);
        setStatusCounts(data.statusCounts);
        setPagination({
          currentPage: data.pagination.page,
          total: data.totalFiltered ?? data.pagination.total,
          totalPages: data.pagination.pages,
        });
      } catch (error) {
        console.error("Error fetching borrowings: ", error);
        toast({
          title: "Error ❌",
          description: "Gagal memuat data peminjaman",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, filterRole, filterStatus, toast]
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [debouncedSearch, filterRole, filterStatus]);

  useEffect(() => {
    fetchBorrowings(pagination.currentPage);
  }, [
    debouncedSearch,
    filterRole,
    filterStatus,
    fetchBorrowings,
    pagination.currentPage,
  ]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  return {
    borrowings,
    total,
    statusCounts,
    isLoading,
    isDeleting,
    openDeleteModal,
    deletingChemicalId,
    pagination,
    handlePageChange,
    setIsDeleting,
    setOpenDeleteModal,
    setDeletingChemicalId,
  };
};

export default useBorrowings;
