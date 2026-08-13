import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from './layout/AuthLayout.jsx'
import DashboardLayout from './layout/DashboardLayout.jsx'
import StoreLayout from './layout/StoreLayout.jsx'
import StoreHome from './pages/store/StoreHome.jsx'
import ItemDetail from './pages/store/ItemDetail.jsx'
import BookingFlow from './pages/store/BookingFlow.jsx'
import MyBookings from './pages/store/MyBookings.jsx'
import ClaimBooking from './pages/store/ClaimBooking.jsx'
import PaymentResult from './pages/store/PaymentResult.jsx'
import SignIn from './pages/auth/SignIn.jsx'
import SignUp from './pages/auth/SignUp.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'
import NotFound from './pages/public/NotFound.jsx'

import Overview from './pages/dashboard/Overview.jsx'
import Calendar from './pages/dashboard/Calendar.jsx'
import Items from './pages/dashboard/Items.jsx'
import ItemEditor from './pages/dashboard/ItemEditor.jsx'
import ItemWaitingList from './pages/dashboard/ItemWaitingList.jsx'
import Resources from './pages/dashboard/Resources.jsx'
import ResourceEditor from './pages/dashboard/ResourceEditor.jsx'
import Orders from './pages/dashboard/Orders.jsx'
import OrderDetail from './pages/dashboard/OrderDetail.jsx'
import Waitlist from './pages/dashboard/Waitlist.jsx'
import Customers from './pages/dashboard/Customers.jsx'
import CustomerDetail from './pages/dashboard/CustomerDetail.jsx'
import LeadGeneration from './pages/dashboard/LeadGeneration.jsx'
import Tags from './pages/dashboard/Tags.jsx'
import Notifications from './pages/dashboard/Notifications.jsx'
import Organization from './pages/dashboard/Organization.jsx'
import CustomBookingPage from './pages/dashboard/CustomBookingPage.jsx'
import PaymentSettings from './pages/dashboard/PaymentSettings.jsx'
import LineIntegration from './pages/dashboard/LineIntegration.jsx'
import Upgrade from './pages/dashboard/Upgrade.jsx'

/**
 * Route tree — mirrors production.
 *   /:orgSlug is the tenant (vendor) slug, e.g. "midao".
 *   Auth routes are registered both at root and under /:orgSlug.
 *   Protected dashboard lives at /:orgSlug/dashboard/*.
 */
export default function App() {
  const authRoutes = (
    <Route element={<AuthLayout />}>
      <Route path="sign-in" element={<SignIn />} />
      <Route path="sign-up" element={<SignUp />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
    </Route>
  )

  return (
    <Routes>
      {/* redirect bare root to the demo tenant's dashboard */}
      <Route path="/" element={<Navigate to="/midao/dashboard" replace />} />

      {/* root-level auth (no tenant) */}
      {authRoutes}

      {/* tenant-scoped */}
      <Route path=":orgSlug">
        {authRoutes}

        {/* customer-facing storefront */}
        <Route element={<StoreLayout />}>
          <Route index element={<StoreHome />} />
          <Route path="items/:itemId" element={<ItemDetail />} />
          <Route path="calendar" element={<BookingFlow />} />
          <Route path="orders" element={<MyBookings />} />
          <Route path="claim/:token" element={<ClaimBooking />} />
          <Route path="payment-result" element={<PaymentResult />} />
        </Route>

        <Route path="dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="items" element={<Items />} />
          <Route path="items/new" element={<ItemEditor />} />
          <Route path="items/:itemId" element={<ItemEditor />} />
          <Route path="items/:itemId/waiting-list" element={<ItemWaitingList />} />
          <Route path="resources" element={<Resources />} />
          <Route path="resources/new" element={<ResourceEditor />} />
          <Route path="resources/:resourceId" element={<ResourceEditor />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="waitlist" element={<Waitlist />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:customerId" element={<CustomerDetail />} />
          <Route path="lead-generation" element={<LeadGeneration />} />
          <Route path="tags" element={<Tags />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="organization" element={<Organization />} />
          <Route path="custom-booking-page" element={<CustomBookingPage />} />
          <Route path="payment-settings" element={<PaymentSettings />} />
          <Route path="line-integration" element={<LineIntegration />} />
          <Route path="upgrade" element={<Upgrade />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
