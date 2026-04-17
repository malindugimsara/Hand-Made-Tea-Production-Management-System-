'use client';;
import * as React from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';

import { Highlight, HighlightItem } from '@/components/animate-ui/primitives/effects/highlight';
import { getStrictContext } from '@/lib/get-strict-context';
import { useControlledState } from '@/hooks/use-controlled-state';
import { useDataState } from '@/hooks/use-data-state';

const [DropdownMenuProvider, useDropdownMenu] =
  getStrictContext('DropdownMenuContext');

const [DropdownMenuSubProvider, useDropdownMenuSub] =
  getStrictContext('DropdownMenuSubContext');

function DropdownMenu(props) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });
  const [highlightedValue, setHighlightedValue] = React.useState(null);

  return (
    <DropdownMenuProvider value={{ isOpen, setIsOpen, highlightedValue, setHighlightedValue }}>
      <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} onOpenChange={setIsOpen} />
    </DropdownMenuProvider>
  );
}

function DropdownMenuTrigger(props) {
  return (<DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />);
}

function DropdownMenuPortal(props) {
  return (<DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />);
}

function DropdownMenuGroup(props) {
  return (<DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />);
}

function DropdownMenuSub(props) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <DropdownMenuSubProvider value={{ isOpen, setIsOpen }}>
      <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} onOpenChange={setIsOpen} />
    </DropdownMenuSubProvider>
  );
}

function DropdownMenuRadioGroup(props) {
  return (<DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />);
}

function DropdownMenuSubTrigger({
  disabled,
  textValue,
  ...props
}) {
  const { setHighlightedValue } = useDropdownMenu();
  const [, highlightedRef] = useDataState('highlighted', undefined, (value) => {
    if (value === true) {
      const el = highlightedRef.current;
      const v = el?.dataset.value || el?.id || null;
      if (v) setHighlightedValue(v);
    }
  });

  return (
    <DropdownMenuPrimitive.SubTrigger ref={highlightedRef} disabled={disabled} textValue={textValue} asChild>
      <motion.div data-slot="dropdown-menu-sub-trigger" data-disabled={disabled} {...props} />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  loop,
  onEscapeKeyDown,
  onPointerDownOutside,
  onFocusOutside,
  onInteractOutside,
  sideOffset,
  alignOffset,
  avoidCollisions,
  collisionBoundary,
  collisionPadding,
  arrowPadding,
  sticky,
  hideWhenDetached,
  transition = { duration: 0.2 },
  style,
  container,
  ...props
}) {
  const { isOpen } = useDropdownMenuSub();

  return (
    <AnimatePresence>
      {isOpen && (
        <DropdownMenuPortal forceMount container={container}>
          <DropdownMenuPrimitive.SubContent
            asChild
            forceMount
            loop={loop}
            onEscapeKeyDown={onEscapeKeyDown}
            onPointerDownOutside={onPointerDownOutside}
            onFocusOutside={onFocusOutside}
            onInteractOutside={onInteractOutside}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            avoidCollisions={avoidCollisions}
            collisionBoundary={collisionBoundary}
            collisionPadding={collisionPadding}
            arrowPadding={arrowPadding}
            sticky={sticky}
            hideWhenDetached={hideWhenDetached}>
            <motion.div
              key="dropdown-menu-sub-content"
              data-slot="dropdown-menu-sub-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transition}
              style={{ willChange: 'opacity, transform', ...style }}
              {...props} />
          </DropdownMenuPrimitive.SubContent>
        </DropdownMenuPortal>
      )}
    </AnimatePresence>
  );
}

function DropdownMenuHighlight({
  transition = { type: 'spring', stiffness: 350, damping: 35 },
  ...props
}) {
  const { highlightedValue } = useDropdownMenu();

  return (
    <Highlight
      data-slot="dropdown-menu-highlight"
      click={false}
      controlledItems
      transition={transition}
      value={highlightedValue}
      {...props} />
  );
}

function DropdownMenuContent({
  loop,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  onFocusOutside,
  onInteractOutside,
  side,
  sideOffset,
  align,
  alignOffset,
  avoidCollisions,
  collisionBoundary,
  collisionPadding,
  arrowPadding,
  sticky,
  hideWhenDetached,
  transition = { duration: 0.2 },
  style,
  container,
  ...props
}) {
  const { isOpen } = useDropdownMenu();

  return (
    <AnimatePresence>
      {isOpen && (
        <DropdownMenuPortal forceMount container={container}>
          <DropdownMenuPrimitive.Content
            asChild
            loop={loop}
            onCloseAutoFocus={onCloseAutoFocus}
            onEscapeKeyDown={onEscapeKeyDown}
            onPointerDownOutside={onPointerDownOutside}
            onFocusOutside={onFocusOutside}
            onInteractOutside={onInteractOutside}
            side={side}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            avoidCollisions={avoidCollisions}
            collisionBoundary={collisionBoundary}
            collisionPadding={collisionPadding}
            arrowPadding={arrowPadding}
            sticky={sticky}
            hideWhenDetached={hideWhenDetached}>
            <motion.div
              key="dropdown-menu-content"
              data-slot="dropdown-menu-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transition}
              style={{ willChange: 'opacity, transform', ...style }}
              {...props} />
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPortal>
      )}
    </AnimatePresence>
  );
}

function DropdownMenuHighlightItem(props) {
  return <HighlightItem data-slot="dropdown-menu-highlight-item" {...props} />;
}

function DropdownMenuItem({
  disabled,
  onSelect,
  textValue,
  ...props
}) {
  const { setHighlightedValue } = useDropdownMenu();
  const [, highlightedRef] = useDataState('highlighted', undefined, (value) => {
    if (value === true) {
      const el = highlightedRef.current;
      const v = el?.dataset.value || el?.id || null;
      if (v) setHighlightedValue(v);
    }
  });

  return (
    <DropdownMenuPrimitive.Item
      ref={highlightedRef}
      disabled={disabled}
      onSelect={onSelect}
      textValue={textValue}
      asChild>
      <motion.div data-slot="dropdown-menu-item" data-disabled={disabled} {...props} />
    </DropdownMenuPrimitive.Item>
  );
}

function DropdownMenuCheckboxItem({
  checked,
  onCheckedChange,
  disabled,
  onSelect,
  textValue,
  ...props
}) {
  const { setHighlightedValue } = useDropdownMenu();
  const [, highlightedRef] = useDataState('highlighted', undefined, (value) => {
    if (value === true) {
      const el = highlightedRef.current;
      const v = el?.dataset.value || el?.id || null;
      if (v) setHighlightedValue(v);
    }
  });

  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={highlightedRef}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      onSelect={onSelect}
      textValue={textValue}
      asChild>
      <motion.div
        data-slot="dropdown-menu-checkbox-item"
        data-disabled={disabled}
        {...props} />
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioItem({
  value,
  disabled,
  onSelect,
  textValue,
  ...props
}) {
  const { setHighlightedValue } = useDropdownMenu();
  const [, highlightedRef] = useDataState('highlighted', undefined, (value) => {
    if (value === true) {
      const el = highlightedRef.current;
      const v = el?.dataset.value || el?.id || null;
      if (v) setHighlightedValue(v);
    }
  });

  return (
    <DropdownMenuPrimitive.RadioItem
      ref={highlightedRef}
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      textValue={textValue}
      asChild>
      <motion.div data-slot="dropdown-menu-radio-item" data-disabled={disabled} {...props} />
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel(props) {
  return (<DropdownMenuPrimitive.Label data-slot="dropdown-menu-label" {...props} />);
}

function DropdownMenuSeparator(props) {
  return (<DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" {...props} />);
}

function DropdownMenuShortcut(props) {
  return <span data-slot="dropdown-menu-shortcut" {...props} />;
}

function DropdownMenuItemIndicator(props) {
  return (
    <DropdownMenuPrimitive.ItemIndicator data-slot="dropdown-menu-item-indicator" asChild>
      <motion.div {...props} />
    </DropdownMenuPrimitive.ItemIndicator>
  );
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuHighlight, DropdownMenuContent, DropdownMenuItem, DropdownMenuItemIndicator, DropdownMenuHighlightItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup, useDropdownMenu, useDropdownMenuSub };
