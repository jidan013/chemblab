import { createUserRoleData } from "@/lib/services/users/user.service";
import { hashPassword, requireRoleOrNull } from "@/lib/auth";
import db from "@/lib/db";
import { registerSchema } from "@/lib/validation/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRoleOrNull(["ADMIN"]);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, role, status, username, name, roleId } =
      parsed.data;

    const existingUser = await db.user.findFirst({
      where: { OR: [{ email }] },
    });

    // Cek apakah email sudah digunakan
    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah digunakan" },
        { status: 409 }
      );
    }

    // Cek apakah roleId sudah digunakan
    /*
    const roleIdTaken = await isRoleIdTaken(role, roleId);
    if (roleIdTaken) {
      return NextResponse.json(
        { error: `${role} dengan ID tersebut sudah ada` },
        { status: 409 }
      );
    }
    */
    const roleIdTaken = await (async () => {
      switch (role) {
        case "ADMIN":
          return db.admin.findUnique({ where: { pin: roleId } });
        case "MAHASISWA":
          return db.mahasiswa.findUnique({ where: { nim: roleId } });
        case "DOSEN":
          return db.dosen.findUnique({ where: { nidn: roleId } });
        case "LABORAN":
          return db.laboran.findUnique({ where: { nip: roleId } });
        case "PETUGAS_GUDANG":
          return db.laboran.findUnique({ where: { nip: roleId } });
        default:
          return null;
      }
    })();

    if (roleIdTaken) {
      return NextResponse.json(
        { error: `${role} dengan ID tersebut sudah ada` },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          status,
          role,
        },
      });

      // Membuat relasi antara user dan role berdasarkan role
      await createUserRoleData(tx, role, roleId, name, user.id);

      return user;
    });

    return NextResponse.json(
      { message: "Pengguna berhasil dibuat", userId: newUser.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error register user:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat pengguna" },
      { status: 500 }
    );
  }
}
