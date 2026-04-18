import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Switch, Route } from "wouter";
import { useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Finance from "./pages/Finance";
import Procurement from "./pages/Procurement";
import Vendors from "./pages/Vendors";
import Inventory from "./pages/Inventory";
import Tenders from "./pages/Tenders";
import Vehicles from "./pages/Vehicles";
import HR from "./pages/HR";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/finance" component={Finance} />
            <Route path="/procurement" component={Procurement} />
            <Route path="/vendors" component={Vendors} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/tenders" component={Tenders} />
            <Route path="/vehicles" component={Vehicles} />
            <Route path="/hr" component={HR} />
          </Switch>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}
