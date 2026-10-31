import {
    Box,
    Container,
    ThemeProvider as MuiThemeProvider,
    CssBaseline,
    useMediaQuery,
} from "@mui/material";
import { MainpPageScreen } from "@screens/main-page/MainpPageScreen";
import {
    ActivityTypes,
    Dashboard,
    Settings,
    ActivityTypesSelection,
    AutoWashSettings,
    AutoServiceSettings,
    AutoServiceRegistration,
    AutoShopSettings,
    Chats,
    Applications,
    Bookings,
    ProfessionalCabinet,
    ForBusiness,
    Calendar,
    Stories,
    BusinessCRM,
} from "@screens/cabinet";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import LoginScreen from "@screens/auth/login/LoginScreen";
import RegisterScreen from "@screens/auth/register/RegisterScreen";
import { DashboardLayout } from "@modules/layout/features/UserCabinetLayout/DashboardLayout";
import "./global.css";
import { muiTheme } from "@common/theme/muiTheme";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ToastContainer } from "react-toastify";
import { NotificationListener } from "../components/NotificationListener";
import "react-toastify/dist/ReactToastify.css";
import { ProtectedRoute } from "@common/components/ProtectedRoute";
import { ModerationQueuePage } from "@screens/admin/ModerationQueuePage";
import { CaseDetailPage } from "@screens/admin/CaseDetailPage";
import { AuditLogPage } from "@screens/admin/AuditLogPage";
import { ProfessionalUsersPage } from "@screens/admin/ProfessionalUsersPage";
import { AdminGuard } from "@modules/admin/components/AdminGuard";
import { ThemeProvider } from "@common/theme";
import { MasterDetailsScreen } from "@screens/master-details/MasterDetails";
import { OrderPreviewShowcaseScreen } from "@screens/showcase/OrderPreviewShowcase";
import { OrderPreviewFinalScreen } from "@screens/showcase/OrderPreviewFinal";
import { ApplicationsRedesignScreen } from "@screens/showcase/ApplicationsRedesign";
import { MasterCardRedesignScreen } from "@screens/showcase/MasterCardRedesign";
import {
    BottomNavigationBar,
    WelcomeModal,
} from "@modules/layout";
import {
    BOTTOM_NAV_RESERVED_SPACE,
    COMPACT_LAYOUT_MEDIA_QUERY,
} from "@modules/layout/features/layoutViewport";

export function App() {
    const shouldReserveBottomNavSpace = useMediaQuery(COMPACT_LAYOUT_MEDIA_QUERY);

    return (
        <BrowserRouter>
                <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    localeText={{
                        fieldHoursPlaceholder: () => "--",
                        fieldMinutesPlaceholder: () => "--",
                    }}
                >
                    <MuiThemeProvider theme={muiTheme}>
                        <CssBaseline />
                        <ThemeProvider>
                            <Container
                                maxWidth={false}
                                disableGutters
                                sx={{
                                    pb: shouldReserveBottomNavSpace
                                        ? BOTTOM_NAV_RESERVED_SPACE
                                        : 0,
                                }}
                            >
                                <Box>
                                    <Routes>
                                        <Route
                                            path="/"
                                            element={<MainpPageScreen />}
                                        />
                                        <Route
                                            path="/showcase/order-preview"
                                            element={<OrderPreviewShowcaseScreen />}
                                        />
                                        <Route
                                            path="/order-preview"
                                            element={<OrderPreviewShowcaseScreen />}
                                        />
                                        <Route
                                            path="/order-preview-final"
                                            element={<OrderPreviewFinalScreen />}
                                        />
                                        <Route
                                            path="/applications-redesign"
                                            element={<ApplicationsRedesignScreen />}
                                        />
                                        <Route
                                            path="/master-card-redesign"
                                            element={<MasterCardRedesignScreen />}
                                        />
                                        <Route
                                            path="/showcase/master-card-redesign"
                                            element={<MasterCardRedesignScreen />}
                                        />
                                        <Route
                                            path="/login"
                                            element={<LoginScreen />}
                                        />
                                        <Route
                                            path="/register"
                                            element={<RegisterScreen />}
                                        />

                                        <Route
                                            path="/cabinet"
                                            element={
                                                <ProtectedRoute>
                                                    <DashboardLayout>
                                                        <Dashboard />
                                                    </DashboardLayout>
                                                </ProtectedRoute>
                                            }
                                        />

                                        <Route
                                            path="/cabinet/bookings"
                                            element={
                                                <ProtectedRoute>
                                                    <Bookings />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/bookings/cancelled"
                                            element={
                                                <ProtectedRoute>
                                                    <Navigate
                                                        to="/cabinet/bookings?tab=cancelled"
                                                        replace
                                                    />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/for-business"
                                            element={
                                                <ProtectedRoute>
                                                    <ForBusiness />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/professional"
                                            element={
                                                <ProtectedRoute requiredCapability="professionalCabinet">
                                                    <ProfessionalCabinet />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/crm"
                                            element={
                                                <ProtectedRoute requiredCapability="businessCrm">
                                                    <BusinessCRM />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/calendar"
                                            element={
                                                <ProtectedRoute requiredCapability="calendar">
                                                    <Calendar />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/stories"
                                            element={
                                                <ProtectedRoute requiredCapability="professionalCabinet">
                                                    <Stories />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/applications"
                                            element={
                                                <ProtectedRoute requiredCapability="applications">
                                                    <Applications />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/chats"
                                            element={
                                                <ProtectedRoute>
                                                    <Chats />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/activity-types"
                                            element={
                                                <ProtectedRoute>
                                                    <ActivityTypes />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/activity-types-selection"
                                            element={
                                                <ProtectedRoute>
                                                    <ActivityTypesSelection />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/activity-types-selection/auto-service"
                                            element={
                                                <ProtectedRoute>
                                                    <AutoServiceRegistration />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/master-settings"
                                            element={
                                                <ProtectedRoute>
                                                    <Settings />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/auto-wash-settings"
                                            element={
                                                <ProtectedRoute>
                                                    <AutoWashSettings />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/auto-service-settings"
                                            element={
                                                <ProtectedRoute>
                                                    <AutoServiceSettings />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/cabinet/auto-shop-settings"
                                            element={
                                                <ProtectedRoute>
                                                    <AutoShopSettings />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="/master"
                                            element={<MasterDetailsScreen />}
                                        />
                                        <Route
                                            path="/master-details"
                                            element={<MasterDetailsScreen />}
                                        />
                                        <Route
                                            path="/provider"
                                            element={<MasterDetailsScreen />}
                                        />

                                        {/* Admin panel */}
                                        <Route
                                            path="/admin"
                                            element={<Navigate to="/admin/moderation" replace />}
                                        />
                                        <Route
                                            path="/admin/moderation"
                                            element={
                                                <AdminGuard>
                                                    <ModerationQueuePage />
                                                </AdminGuard>
                                            }
                                        />
                                        <Route
                                            path="/admin/moderation/:caseId"
                                            element={
                                                <AdminGuard>
                                                    <CaseDetailPage />
                                                </AdminGuard>
                                            }
                                        />
                                        <Route
                                            path="/admin/audit"
                                            element={
                                                <AdminGuard>
                                                    <AuditLogPage />
                                                </AdminGuard>
                                            }
                                        />
                                        <Route
                                            path="/admin/professionals"
                                            element={
                                                <AdminGuard>
                                                    <ProfessionalUsersPage />
                                                </AdminGuard>
                                            }
                                        />
                                    </Routes>
                                </Box>
                            </Container>
                            <BottomNavigationBar />
                            <WelcomeModal />
                            <NotificationListener userRole="all" />
                            <ToastContainer
                                position="top-right"
                                autoClose={3000}
                                hideProgressBar={false}
                                newestOnTop={false}
                                closeOnClick
                                rtl={false}
                                pauseOnFocusLoss
                                draggable
                                pauseOnHover
                            />
                        </ThemeProvider>
                    </MuiThemeProvider>
                </LocalizationProvider>
            </BrowserRouter>
    );
}
