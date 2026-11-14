import { PERMISSIONS_KEY } from 'src/roles/api/require-permissions.decorator';
import { ProductsController } from 'src/products/api/products.controller';
import { CategoriesController } from 'src/categories/api/categories.controller';
import { ContentController } from 'src/content/api/content.controller';
import { PlaylistsController } from 'src/content/api/playlists.controller';
import { ScreensController } from 'src/screens/api/screens.controller';
import { StoresController } from 'src/stores/api/stores.controller';
import { OrdersController } from 'src/orders/api/orders.controller';
import { TenantsController } from 'src/tenants/api/tenants.controller';
import { EmployeesController } from 'src/employees/api/employees.controller';

// Mirrors the employee grants in database/scripts/001_schema.sql.
const EMPLOYEE = ['stores:read', 'categories:read', 'products:read', 'orders:read', 'orders:update'];

const requiredBy = (controller: any) =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => [name, Reflect.getMetadata(PERMISSIONS_KEY, controller.prototype[name]) as string[] | undefined] as const);

describe('Permisos requeridos por ruta', () => {
  it.each([
    ProductsController, CategoriesController, ContentController, PlaylistsController, ScreensController, StoresController, OrdersController, TenantsController, EmployeesController,
  ])('%p exige permisos en todas sus rutas privadas', (controller) => {
    for (const [name, codes] of requiredBy(controller)) {
      expect({ name, codes: codes?.length }).toEqual({ name, codes: expect.any(Number) });
      expect(codes!.length).toBeGreaterThan(0);
    }
  });

  it.each([ProductsController, CategoriesController, ContentController, PlaylistsController, ScreensController, StoresController])(
    '%p: el empleado no puede editar catalogo, contenido, pantallas ni locales',
    (controller) => {
      for (const [name, codes] of requiredBy(controller)) {
        const isRead = codes!.every((c) => c.endsWith(':read'));
        if (!isRead) expect({ name, allowed: codes!.every((c) => EMPLOYEE.includes(c)) }).toEqual({ name, allowed: false });
      }
    },
  );

  it('el empleado puede leer y cambiar el estado de las ordenes', () => {
    for (const [, codes] of requiredBy(OrdersController)) {
      expect(codes!.every((c) => EMPLOYEE.includes(c))).toBe(true);
    }
  });

  it('el empleado no puede leer contenido ni pantallas', () => {
    for (const controller of [ContentController, PlaylistsController, ScreensController]) {
      for (const [, codes] of requiredBy(controller)) {
        expect(codes!.every((c) => EMPLOYEE.includes(c))).toBe(false);
      }
    }
  });

  it('solo root administra tenants: ni owner ni employee tienen tenants:*', () => {
    for (const [, codes] of requiredBy(TenantsController)) {
      expect(codes!.every((c) => c.startsWith('tenants:'))).toBe(true);
      expect(codes!.some((c) => EMPLOYEE.includes(c))).toBe(false);
    }
  });

  it('el empleado no alcanza ninguna ruta de /employees (solo employees:*, que no tiene)', () => {
    for (const [, codes] of requiredBy(EmployeesController)) {
      expect(codes!.every((c) => c.startsWith('employees:'))).toBe(true);
      expect(codes!.some((c) => EMPLOYEE.includes(c))).toBe(false);
    }
  });

  it.each(['suspend', 'reactivate'])('TenantsController.%s exige tenants:update (solo root)', (name) => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TenantsController.prototype[name as 'suspend'])).toEqual(['tenants:update']);
  });
});
