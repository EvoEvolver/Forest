import React from 'react';
import {Chip} from '@mui/material';
import {useTheme} from '@mui/material/styles';

interface TagsCellProps {
    value?: string[];
}

const TagsCell: React.FC<TagsCellProps> = ({value}) => {
    const theme = useTheme();
    
    return (
        <>
            {value && value.length > 0 ? (
                <>
                    {value.slice(0, 2).map((tag, index) => (
                        <Chip
                            key={index}
                            label={tag}
                            size="small"
                            sx={{
                                bgcolor: theme.palette.primary.light + '20',
                                color: theme.palette.primary.main,
                            }}
                        />
                    ))}
                    {value.length > 2 && (
                        <Chip
                            label={`+${value.length - 2}`}
                            size="small"
                            sx={{
                                color: theme.palette.text.primary
                            }}
                        />
                    )}
                </>
            ) : (
                <Chip
                    label={`No tags`}
                    size="small"
                    sx={{
                        color: theme.palette.text.primary
                    }}
                />
            )}
        </>
    );
};

export default TagsCell; 