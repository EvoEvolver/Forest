import React from "react";
import { Card, CardContent, Typography, Stack, Box } from "@mui/material";

type Props = {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode | any;
  footer?: React.ReactNode;
  cardheading?: string | React.ReactNode;
  headtitle?: string | React.ReactNode;
  headsubtitle?: string | React.ReactNode;
  children?: React.ReactNode;
  middlecontent?: string | React.ReactNode;
};

const DashboardCard = ({
  title,
  subtitle,
  children,
  action,
  footer,
  cardheading,
  headtitle,
  headsubtitle,
  middlecontent,
}: Props) => {
  return (
    <Card sx={{ height: '100%' }}>
      {title && (
        <CardContent sx={{ pb: title ? 1 : 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {title}
            </Typography>
            {action}
          </Box>
        </CardContent>
      )}
      <CardContent sx={{ pt: title ? 0 : 2, fontSize: '0.875rem' }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
