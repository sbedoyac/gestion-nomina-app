-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "area" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DayAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workDayId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'Cerdo',
    "cargoDia" TEXT NOT NULL,
    "cerdosParticipados" INTEGER DEFAULT 0,
    CONSTRAINT "DayAssignment_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "WorkDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DayAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DayAssignment" ("cargoDia", "cerdosParticipados", "employeeId", "id", "workDayId") SELECT "cargoDia", "cerdosParticipados", "employeeId", "id", "workDayId" FROM "DayAssignment";
DROP TABLE "DayAssignment";
ALTER TABLE "new_DayAssignment" RENAME TO "DayAssignment";
CREATE UNIQUE INDEX "DayAssignment_workDayId_employeeId_productType_key" ON "DayAssignment"("workDayId", "employeeId", "productType");
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "cargoBase" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "area" TEXT NOT NULL DEFAULT 'Cerdo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Employee" ("activo", "cargoBase", "cedula", "createdAt", "id", "nombre") SELECT "activo", "cargoBase", "cedula", "createdAt", "id", "nombre" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_cedula_key" ON "Employee"("cedula");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workDayId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'Cerdo',
    "cargoDia" TEXT NOT NULL,
    "pagoCalculado" INTEGER NOT NULL,
    "detalle" TEXT NOT NULL,
    CONSTRAINT "Payment_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "WorkDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("cargoDia", "detalle", "employeeId", "id", "pagoCalculado", "workDayId") SELECT "cargoDia", "detalle", "employeeId", "id", "pagoCalculado", "workDayId" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_workDayId_employeeId_productType_key" ON "Payment"("workDayId", "employeeId", "productType");
CREATE TABLE "new_ProductionDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workDayId" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'Cerdo',
    "cerdosDespostados" INTEGER NOT NULL,
    "valorDesposte" INTEGER NOT NULL,
    "valorRecogedor" INTEGER NOT NULL,
    "incluirCoordinador" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProductionDay_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "WorkDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductionDay" ("cerdosDespostados", "id", "incluirCoordinador", "valorDesposte", "valorRecogedor", "workDayId") SELECT "cerdosDespostados", "id", "incluirCoordinador", "valorDesposte", "valorRecogedor", "workDayId" FROM "ProductionDay";
DROP TABLE "ProductionDay";
ALTER TABLE "new_ProductionDay" RENAME TO "ProductionDay";
CREATE UNIQUE INDEX "ProductionDay_workDayId_productType_key" ON "ProductionDay"("workDayId", "productType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
