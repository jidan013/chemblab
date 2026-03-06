"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Download, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ChemicalFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterForm: string;
  onFilterFormChange: (value: string) => void;
  filterCharacteristic: string;
  onFilterCharacteristicChange: (value: string) => void;
  onExport?: () => void;
  onImport?: (form: string, file: File | null) => void;
  loadingImport?: boolean;
  userRole?: string;
  mode?: "home" | "management";
}

export const ChemicalFilter = ({
  searchTerm,
  onSearchChange,
  filterForm,
  onFilterFormChange,
  filterCharacteristic,
  onFilterCharacteristicChange,
  onExport,
  onImport,
  loadingImport,
  userRole,
  mode = "home",
}: ChemicalFilterProps) => {
  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState("SOLID");
  const [importFile, setImportFile] = useState<File | null>(null);

  const canAction =
    userRole === "ADMIN" ||
    userRole === "LABORAN" ||
    userRole === "PETUGAS_GUDANG";

  const handleImportSubmit = () => {
    onImport?.(importForm, importFile);
    setImportFile(null);
  };

  return (
    <div className="bg-white border rounded-xl">
      <div className="p-6 space-y-2">
        <span className="text-lg font-semibold">Filter & Pencarian</span>
        <p className="text-sm sm:text-base text-muted-foreground">
          Cari bahan kimia berdasarkan nama bahan atau rumus.
        </p>

        <div className="flex flex-col gap-4 mt-4 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <Input
              placeholder="Cari nama bahan atau rumus..."
              className="pl-10 placeholder:text-xs sm:placeholder:text-base"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filter Bentuk */}
          <Select value={filterForm} onValueChange={onFilterFormChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Bentuk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bentuk</SelectItem>
              <SelectItem value="SOLID">Padat</SelectItem>
              <SelectItem value="LIQUID">Cair</SelectItem>
              <SelectItem value="GAS">Gas</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Sifat */}
          <Select
            value={filterCharacteristic}
            onValueChange={onFilterCharacteristicChange}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sifat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sifat</SelectItem>
              <SelectItem value="ACID">Asam</SelectItem>
              <SelectItem value="BASE">Basa</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="OXIDANT">Oksidan</SelectItem>
              <SelectItem value="INDICATOR">Indikator</SelectItem>
            </SelectContent>
          </Select>

          {/* Extra actions hanya di management */}
          {mode === "management" && (
            <>
              {canAction && (
                <Dialog open={importOpen} onOpenChange={setImportOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-white bg-blue-700 hover:bg-blue-400"
                      disabled={loadingImport}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {loadingImport ? "Mengimpor..." : "Import Data"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Data Bahan Kimia</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <Select
                        value={importForm}
                        onValueChange={(v) => setImportForm(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Bentuk" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOLID">Padat</SelectItem>
                          <SelectItem value="LIQUID">Cair</SelectItem>
                          <SelectItem value="GAS">Gas</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) =>
                          setImportFile(e.target.files?.[0] || null)
                        }
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        disabled={!importFile}
                        onClick={handleImportSubmit}
                      >
                        {loadingImport ? "Mengimpor..." : "Import Data"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Button
                variant="outline"
                className="text-white bg-green-700 hover:bg-green-400"
                onClick={onExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
