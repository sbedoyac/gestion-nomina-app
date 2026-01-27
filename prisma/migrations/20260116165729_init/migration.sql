-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "cargoBase" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WorkDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DayAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workDayId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cargoDia" TEXT NOT NULL,
    CONSTRAINT "DayAssignment_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "WorkDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DayAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workDayId" TEXT NOT NULL,
    "cerdosDespostados" INTEGER NOT NULL,
    "valorDesposte" INTEGER NOT NULL,
    "valorRecogedor" INTEGER NOT NULL,
    "incluirCoordinador" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProductionDay_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "WorkDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workDayId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cargoDia" TEXT NOT NULL,
    "pagoCalculado" INTEGER NOT NULL,
    "detalle" TEXT NOT NULL,
    CONSTRAINT "Payment_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "WorkDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cedula_key" ON "Employee"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "WorkDay_fecha_key" ON "WorkDay"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "DayAssignment_workDayId_employeeId_key" ON "DayAssignment"("workDayId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionDay_workDayId_key" ON "ProductionDay"("workDayId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_workDayId_employeeId_key" ON "Payment"("workDayId", "employeeId");
