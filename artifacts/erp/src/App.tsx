import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Dashboard from "./pages/dashboard";
import Projects from "./pages/projects";
import Finance from "./pages/finance";
import Procurement from "./pages/procurement";
import Vendors from "./pages/vendors";
import Inventory from "./pages/inventory";
import Tenders from "./pages/tenders";
import Vehicles from "./pages/vehicles";
import HR from "./pages/hr";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/finance" component={Finance} />
        <Route path="/procurement" component={Procurement} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/tenders" component={Tenders} />
        <Route path="/vehicles" component={Vehicles} />
        <Route path="/hr" component={HR} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
