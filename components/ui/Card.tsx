
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className, children, header, footer, ...props }) => {
  return (
    <div
      className={`rounded-lg border bg-white text-gray-900 shadow-sm ${className || ''}`}
      {...props}
    >
      {header && (
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          {header}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="flex items-center p-6 pt-0 border-t">
          {footer}
        </div>
      )}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ className, title, description, children, ...props }) => (
  <div className={`flex flex-col space-y-1.5 ${className || ''}`} {...props}>
    {title && <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>}
    {description && <p className="text-sm text-gray-500">{description}</p>}
    {children}
  </div>
);

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
const CardTitle: React.FC<CardTitleProps> = ({ className, children, ...props }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className || ''}`} {...props}>
    {children}
  </h3>
);

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
const CardDescription: React.FC<CardDescriptionProps> = ({ className, children, ...props }) => (
  <p className={`text-sm text-gray-500 ${className || ''}`} {...props}>
    {children}
  </p>
);

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardContent: React.FC<CardContentProps> = ({ className, children, ...props }) => (
  <div className={`p-6 pt-0 ${className || ''}`} {...props}>
    {children}
  </div>
);

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardFooter: React.FC<CardFooterProps> = ({ className, children, ...props }) => (
  <div className={`flex items-center p-6 pt-0 ${className || ''}`} {...props}>
    {children}
  </div>
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
