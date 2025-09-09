import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { JSONEditor } from '@/components/ui/json-editor';
import { Loader2 } from 'lucide-react';
import { McpConfig } from 'shared/types';
import type { BaseCodingAgent, ExecutorConfig } from 'shared/types';
import { useUserSystem } from '@/components/config-provider';
import { mcpServersApi } from '@/lib/api';
import { McpConfigStrategyGeneral } from '@/lib/mcp-strategies';

export function McpSettings() {
  const { config, profiles } = useUserSystem();
  const [mcpServers, setMcpServers] = useState('{}');
  const [mcpConfig, setMcpConfig] = useState<McpConfig | null>(null);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<ExecutorConfig | null>(
    null
  );
  const [mcpApplying, setMcpApplying] = useState(false);
  const [mcpConfigPath, setMcpConfigPath] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // Initialize selected profile when config loads
  useEffect(() => {
    if (config?.executor_profile && profiles && !selectedProfile) {
      // Find the current profile
      const currentProfile = profiles[config.executor_profile.executor];
      if (currentProfile) {
        setSelectedProfile(currentProfile);
      } else if (Object.keys(profiles).length > 0) {
        // Default to first profile if current profile not found
        setSelectedProfile(Object.values(profiles)[0]);
      }
    }
  }, [config?.executor_profile, profiles, selectedProfile]);

  // Load existing MCP configuration when selected profile changes
  useEffect(() => {
    const loadMcpServersForProfile = async (profile: ExecutorConfig) => {
      // Reset state when loading
      setMcpLoading(true);
      setMcpError(null);
      // Set default empty config based on agent type using strategy
      setMcpConfigPath('');

      try {
        // Load MCP servers for the selected profile/agent
        // Find the key for this profile
        const profileKey = profiles
          ? Object.keys(profiles).find((key) => profiles[key] === profile)
          : null;
        if (!profileKey) {
          throw new Error('Profile key not found');
        }

        const result = await mcpServersApi.load({
          executor: profileKey as BaseCodingAgent,
        });
        // Store the McpConfig from backend
        setMcpConfig(result.mcp_config);
        // Create the full configuration structure using the schema
        const fullConfig = McpConfigStrategyGeneral.createFullConfig(
          result.mcp_config
        );
        const configJson = JSON.stringify(fullConfig, null, 2);
        setMcpServers(configJson);
        setMcpConfigPath(result.config_path);
      } catch (err: any) {
        if (err?.message && err.message.includes('does not support MCP')) {
          setMcpError(err.message);
        } else {
          console.error('Error loading MCP servers:', err);
        }
      } finally {
        setMcpLoading(false);
      }
    };

    // Load MCP servers for the selected profile
    if (selectedProfile) {
      loadMcpServersForProfile(selectedProfile);
    }
  }, [selectedProfile]);

  const handleMcpServersChange = (value: string) => {
    setMcpServers(value);
    setMcpError(null);

    // Validate JSON on change
    if (value.trim() && mcpConfig) {
      try {
        const parsedConfig = JSON.parse(value);
        // Validate using the schema path from backend
        McpConfigStrategyGeneral.validateFullConfig(mcpConfig, parsedConfig);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setMcpError('Invalid JSON format');
        } else {
          setMcpError(err instanceof Error ? err.message : 'Validation error');
        }
      }
    }
  };

  const handleConfigureVibeKanban = async () => {
    if (!selectedProfile || !mcpConfig) return;

    try {
      // Parse existing configuration
      const existingConfig = mcpServers.trim() ? JSON.parse(mcpServers) : {};

      // Add vibe_kanban to the existing configuration using the schema
      const updatedConfig = McpConfigStrategyGeneral.addVibeKanbanToConfig(
        mcpConfig,
        existingConfig
      );

      // Update the textarea with the new configuration
      const configJson = JSON.stringify(updatedConfig, null, 2);
      setMcpServers(configJson);
      setMcpError(null);
    } catch (err) {
      setMcpError('Failed to configure vibe-kanban MCP server');
      console.error('Error configuring vibe-kanban:', err);
    }
  };

  const handleApplyMcpServers = async () => {
    if (!selectedProfile || !mcpConfig) return;

    setMcpApplying(true);
    setMcpError(null);

    try {
      // Validate and save MCP configuration
      if (mcpServers.trim()) {
        try {
          const fullConfig = JSON.parse(mcpServers);
          McpConfigStrategyGeneral.validateFullConfig(mcpConfig, fullConfig);
          const mcpServersConfig =
            McpConfigStrategyGeneral.extractServersForApi(
              mcpConfig,
              fullConfig
            );

          // Find the key for the selected profile
          const selectedProfileKey = profiles
            ? Object.keys(profiles).find(
                (key) => profiles[key] === selectedProfile
              )
            : null;
          if (!selectedProfileKey) {
            throw new Error('Selected profile key not found');
          }

          await mcpServersApi.save(
            {
              executor: selectedProfileKey as BaseCodingAgent,
            },
            { servers: mcpServersConfig }
          );

          // Show success feedback
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } catch (mcpErr) {
          if (mcpErr instanceof SyntaxError) {
            setMcpError('Invalid JSON format');
          } else {
            setMcpError(
              mcpErr instanceof Error
                ? mcpErr.message
                : 'Failed to save MCP servers'
            );
          }
        }
      }
    } catch (err) {
      setMcpError('Failed to apply MCP server configuration');
      console.error('Error applying MCP servers:', err);
    } finally {
      setMcpApplying(false);
    }
  };

  if (!config) {
    return (
      <div className="py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to load configuration.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mcpError && (
        <Alert variant="destructive">
          <AlertDescription>
            MCP Configuration Error: {mcpError}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <AlertDescription className="font-medium">
            ✓ MCP configuration saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>MCP Server Configuration</CardTitle>
          <CardDescription>
            Configure Model Context Protocol servers to extend coding agent
            capabilities with custom tools and resources.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mcp-executor">Agent</Label>
            <Select
              value={
                selectedProfile
                  ? Object.keys(profiles || {}).find(
                      (key) => profiles![key] === selectedProfile
                    ) || ''
                  : ''
              }
              onValueChange={(value: string) => {
                const profile = profiles?.[value];
                if (profile) setSelectedProfile(profile);
              }}
            >
              <SelectTrigger id="mcp-executor">
                <SelectValue placeholder="Select executor" />
              </SelectTrigger>
              <SelectContent>
                {profiles &&
                  Object.entries(profiles)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([profileKey]) => (
                      <SelectItem key={profileKey} value={profileKey}>
                        {profileKey}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose which agent to configure MCP servers for.
            </p>
          </div>

          {mcpError && mcpError.includes('does not support MCP') ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    MCP Not Supported
                  </h3>
                  <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    <p>{mcpError}</p>
                    <p className="mt-1">
                      To use MCP servers, please select a different executor
                      that supports MCP (Claude, Amp, Gemini, Codex, or
                      Opencode) above.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="mcp-servers">Server Configuration (JSON)</Label>
              <JSONEditor
                id="mcp-servers"
                placeholder={
                  mcpLoading
                    ? 'Loading current configuration...'
                    : '{\n  "server-name": {\n    "type": "stdio",\n    "command": "your-command",\n    "args": ["arg1", "arg2"]\n  }\n}'
                }
                value={mcpLoading ? 'Loading...' : mcpServers}
                onChange={handleMcpServersChange}
                disabled={mcpLoading}
                minHeight={300}
              />
              {mcpError && !mcpError.includes('does not support MCP') && (
                <p className="text-sm text-destructive dark:text-red-400">
                  {mcpError}
                </p>
              )}
              <div className="text-sm text-muted-foreground">
                {mcpLoading ? (
                  'Loading current MCP server configuration...'
                ) : (
                  <span>
                    Changes will be saved to:
                    {mcpConfigPath && (
                      <span className="ml-2 font-mono text-xs">
                        {mcpConfigPath}
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleConfigureVibeKanban}
                  disabled={mcpApplying || mcpLoading || !selectedProfile}
                  className="w-64"
                >
                  Add Vibe-Kanban MCP
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Automatically adds the Vibe-Kanban MCP server configuration.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t pt-4">
        <div className="flex justify-end">
          <Button
            onClick={handleApplyMcpServers}
            disabled={mcpApplying || mcpLoading || !!mcpError || success}
            className={success ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {mcpApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {success && <span className="mr-2">✓</span>}
            {success ? 'Settings Saved!' : 'Save MCP Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
