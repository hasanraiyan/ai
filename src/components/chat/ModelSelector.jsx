import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { 
  MODELS, 
  MODEL_GROUPS, 
  getModelById,
  MODEL_TYPE_ICONS
} from "../../config/ai-models";
import { Check } from "lucide-react";

export function ModelSelector({ selectedModel, onModelChange }) {
  const model = getModelById(selectedModel);
  const TypeIcon = MODEL_TYPE_ICONS[model.type];
  const ModelIcon = model.icon;

  return (
    <div className="px-0.5 pt-1">      
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-full h-auto py-2.5 px-3 dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-white dark:hover:bg-slate-800 transition-colors">
          <SelectValue>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ModelIcon className={`h-5 w-5 ${model.color}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{model.displayName}</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TypeIcon className="h-3 w-3" />
                  <span>{model.type}</span>
                </div>
              </div>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent 
          className="dark:bg-slate-800 dark:border-slate-700 p-1 w-[350px]" 
          align="start"
          sideOffset={4}
        >
          {Object.entries(MODEL_GROUPS).map(([group, models]) => (
            <SelectGroup key={group} className="px-1">
              <SelectLabel className="text-sm font-medium text-foreground dark:text-white px-2 py-2">
                {group}
              </SelectLabel>
              {models.map((model) => {
                const TypeIcon = MODEL_TYPE_ICONS[model.type];
                const ModelIcon = model.icon;

                return (
                  <SelectItem 
                    key={model.name} 
                    value={model.name}
                    className="relative rounded-md py-2.5 px-2 dark:focus:bg-slate-700/50 dark:hover:bg-slate-700/50"
                  >
                    <div className="flex items-center w-full pr-6">
                      <div className="flex-[0.8] flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <ModelIcon className={`h-5 w-5 ${model.color}`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{model.displayName}</span>
                            {model.censored ? (
                              <span className="text-yellow-500">🔒</span>
                            ) : (
                              <span className="text-red-500">🔓</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className="h-3 w-3" />
                              <span>{model.type}</span>
                            </div>
                            {model.features && (
                              <span className="text-slate-400 truncate">• {model.features.join(' • ')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-[0.2] flex justify-end">
                        <Check className={`h-4 w-4 opacity-0 data-[state=checked]:opacity-100 transition-opacity ${model.color}`} />
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
