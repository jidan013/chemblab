"use client";

import type React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { UserAuth } from "@/types/auth";
import useChemicals from "@/hooks/use-chemicals";
import {
  CreateBorrowingFormData,
  createBorrowingSchema,
} from "@/lib/validation/borrowings";
import axios from "axios";
import { FormSelect } from "@/components/form/form-select";
import { FormInput } from "@/components/form/form-input";
import { Combobox } from "@/components/ui/combobox";

interface CreateBorrowingDialogProps {
  children: React.ReactNode;
  user: UserAuth;
}

interface BorrowingItem {
  chemicalId: string;
  quantity: number;
}

export function CreateBorrowingDialog({
  children,
  user,
}: CreateBorrowingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateBorrowingFormData, string>>
  >({});

  const [formData, setFormData] = useState({
    role: user?.role || "MAHASISWA",
    nrp: "",
    supervisor: "",
    noTelp: "",
    sarjanaLevel: "S1",
    purpose: "",
    notes: "",
    items: [{ chemicalId: "", quantity: 0 }] as BorrowingItem[],
  });

  const { toast } = useToast();
  const { chemicals } = useChemicals();

  const chemicalOptions = chemicals.map((chemical) => {
    const truncatedName =
      chemical.name.length > 20
        ? chemical.name.slice(0, 21) + "..."
        : chemical.name;

    return {
      value: chemical.id,
      label: `${truncatedName} - ${chemical.formula}`,
    };
  });

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { chemicalId: "", quantity: 0 }],
    }));
    setSearchTerms((prev) => [...prev, ""]);
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
      setSearchTerms((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (
    index: number,
    field: keyof BorrowingItem,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      return { ...prev, items: updatedItems };
    });
  };

  const getChemicalInfo = (chemicalId: string) => {
    return chemicals.find((c) => c.id === chemicalId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("FormData: ", formData);

    const result = createBorrowingSchema.safeParse(formData);
    if (!result.success) {
      console.log(result.error.issues);
      const fieldErrors: Partial<
        Record<keyof CreateBorrowingFormData, string>
      > = {};
      for (const err of result.error.issues) {
        const field = err.path[0] as keyof CreateBorrowingFormData;
        fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // Validate items
      const validItems = formData.items.filter(
        (item) => item.chemicalId && item.quantity > 0
      );

      if (validItems.length === 0) {
        throw new Error("Pilih minimal satu bahan kimia");
      }

      // Check stock availability
      for (const item of validItems) {
        const chemical = getChemicalInfo(item.chemicalId);
        if (chemical && item.quantity > chemical.stock) {
          throw new Error(
            `Stok ${chemical.name} tidak mencukupi (tersedia: ${chemical.stock} ${chemical.unit})`
          );
        }
      }

      // In a real app, this would call an API
      const response = await axios.post("/api/v1/borrowings", formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("response create peminjaman: 324324", response.data);

      toast({
        title: "Peminjaman Berhasil Diajukan! 🎉",
        description:
          "Permintaan peminjaman Anda sedang menunggu persetujuan dari laboran",
      });

      // Reset form
      setOpen(false);
      setFormData({
        role: user?.role || "MAHASISWA",
        nrp: "",
        supervisor: "",
        noTelp: "",
        sarjanaLevel: "S1",
        purpose: "",
        notes: "",
        items: [{ chemicalId: "", quantity: 0 }],
      });

      // Refresh page to show new data
      setTimeout(() => {
        window.location.reload();
      }, 200);
    } catch (error) {
      console.error("Gagal mengajuka peminjaman: ", error);

      let errorMessage = "Gagal mengajukan peminjaman";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data.message || errorMessage;
      }

      toast({
        title: "Error ❌",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajukan Permintaan Bahan Kimia</DialogTitle>
          <DialogDescription>
            Isi form berikut untuk mengajukan permintaan bahan kimia
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {user?.role === "MAHASISWA" ? (
            <>
              {/* Nama dan NRP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <FormInput
                    id="name"
                    label="Nama"
                    value={user?.name || ""}
                    disabled
                    placeholder="Asam Sulfat"
                  />
                </div>
                <div className="space-y-2">
                  <FormInput
                    id="nrp"
                    label="NRP"
                    value={formData.nrp}
                    onChange={(e) =>
                      setFormData({ ...formData, nrp: e.target.value })
                    }
                    placeholder="A323456789"
                    error={errors.nrp}
                  />
                </div>
              </div>

              {/* Nama Dosen */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <FormInput
                    id="supervisor"
                    label="Nama Dosen Pembimbing"
                    value={formData.supervisor}
                    onChange={(e) =>
                      setFormData({ ...formData, supervisor: e.target.value })
                    }
                    placeholder="Dr. Nama Dosen"
                  />
                </div>
              </div>

              {/* Mahasiswa dan no telp/wa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <FormSelect
                    htmlFor="sarjanaLevel"
                    label="Mahasiswa"
                    value={formData.sarjanaLevel}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        sarjanaLevel:
                          value ??
                          ("S1" as CreateBorrowingFormData["sarjanaLevel"]),
                      })
                    }>
                    <SelectItem value="S1">S1</SelectItem>
                    <SelectItem value="S2">S2</SelectItem>
                    <SelectItem value="S3">S3</SelectItem>
                  </FormSelect>
                </div>
                <div className="space-y-2">
                  <FormInput
                    id="noTelp"
                    label="No Telepon/WA"
                    value={formData.noTelp}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        noTelp: e.target.value,
                      })
                    }
                    placeholder="081234567890"
                    error={errors.noTelp}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <FormInput
                  id="name"
                  label="Nama"
                  value={user?.name || ""}
                  disabled
                  placeholder="Namamu"
                />
              </div>
            </div>
          )}

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">
              {user.role === "MAHASISWA"
                ? "Judul Penelitian/Kegiatan"
                : "Nama Praktikum"}{" "}
              *
            </Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) =>
                setFormData({ ...formData, purpose: e.target.value })
              }
              required
              placeholder="Contoh: Praktikum Kimia Analitik - Titrasi Asam Basa"
              rows={3}
            />
            {errors.purpose && (
              <p className="text-xs text-red-500">{errors.purpose}</p>
            )}
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Bahan Kimia yang Diminta *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Bahan
              </Button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Bahan #{index + 1}</h4>
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Combobox
                        label="Pilih Bahan Kimia"
                        options={chemicalOptions}
                        value={item.chemicalId}
                        onValueChange={(value) =>
                          updateItem(index, "chemicalId", value)
                        }
                        searchTerm={searchTerms[index] || ""}
                        onSearchChange={(term) => {
                          const updated = [...searchTerms];
                          updated[index] = term;
                          setSearchTerms(updated);
                        }}
                        placeholder="Pilih bahan kimia"
                        searchPlaceholder="Cari bahan kimia..."
                      />
                    </div>

                    <div>
                      <Label>Jumlah</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              Number.parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                        />
                        {item.chemicalId && (
                          <div className="flex items-center px-3 bg-gray-100 rounded-md text-sm text-gray-600">
                            {getChemicalInfo(item.chemicalId)?.unit}
                          </div>
                        )}
                      </div>
                      {item.chemicalId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Stok tersedia:{" "}
                          {getChemicalInfo(item.chemicalId)?.stock}{" "}
                          {getChemicalInfo(item.chemicalId)?.unit}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan Tambahan</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Catatan atau informasi tambahan (opsional)"
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Mengajukan...
                </div>
              ) : (
                "Ajukan Permintaan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
