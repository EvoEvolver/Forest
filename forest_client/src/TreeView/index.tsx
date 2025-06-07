import React from 'react';
import SelectedNodeLayer from './SelectedNodeLayer';

export default function TreeView(props) {
    return (
        <div
            style={{
              height: '99%',
              width: "100%",
              paddingTop: "10px"
        }}>
            <SelectedNodeLayer/>
        </div>
    );
}